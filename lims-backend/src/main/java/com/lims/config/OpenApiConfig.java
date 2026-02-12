package com.lims.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI limsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("LIMS API")
                        .description("Laboratory Information Management System — REST API")
                        .version("0.1.0")
                        .contact(new Contact()
                                .name("LIMS Development Team"))
                        .license(new License()
                                .name("Proprietary")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Development"),
                        new Server().url("https://lims.example.com").description("Production")
                ));
    }
}
