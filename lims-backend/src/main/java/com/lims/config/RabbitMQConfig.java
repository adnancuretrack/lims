package com.lims.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange for all LIMS events
    public static final String LIMS_EXCHANGE = "lims.events";

    // Queues
    public static final String NOTIFICATION_QUEUE = "lims.notifications";
    public static final String ERP_SYNC_QUEUE = "lims.erp-sync";
    public static final String REPORT_GENERATION_QUEUE = "lims.report-generation";
    public static final String INVENTORY_UPDATE_QUEUE = "lims.inventory-update";

    @Bean
    public TopicExchange limsExchange() {
        return new TopicExchange(LIMS_EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    @Bean
    public Queue erpSyncQueue() {
        return QueueBuilder.durable(ERP_SYNC_QUEUE).build();
    }

    @Bean
    public Queue reportGenerationQueue() {
        return QueueBuilder.durable(REPORT_GENERATION_QUEUE).build();
    }

    @Bean
    public Queue inventoryUpdateQueue() {
        return QueueBuilder.durable(INVENTORY_UPDATE_QUEUE).build();
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange limsExchange) {
        return BindingBuilder.bind(notificationQueue).to(limsExchange).with("event.#");
    }

    @Bean
    public Binding erpSyncBinding(Queue erpSyncQueue, TopicExchange limsExchange) {
        return BindingBuilder.bind(erpSyncQueue).to(limsExchange).with("event.result.authorized");
    }

    @Bean
    public Binding reportBinding(Queue reportGenerationQueue, TopicExchange limsExchange) {
        return BindingBuilder.bind(reportGenerationQueue).to(limsExchange).with("event.report.#");
    }

    @Bean
    public Binding inventoryBinding(Queue inventoryUpdateQueue, TopicExchange limsExchange) {
        return BindingBuilder.bind(inventoryUpdateQueue).to(limsExchange).with("event.result.entered");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
