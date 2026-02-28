package com.lims.module.sample;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lims.module.sample.dto.SampleRegistrationRequest;
import com.lims.module.sample.entity.Client;
import com.lims.module.sample.entity.Product;
import com.lims.module.sample.repository.ClientRepository;
import com.lims.module.sample.repository.JobRepository;
import com.lims.module.sample.repository.ProductRepository;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // Uses H2
@Transactional
class SampleIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ClientRepository clientRepository;
    @Autowired ProductRepository productRepository;
    @Autowired JobRepository jobRepository;
    @Autowired SampleRepository sampleRepository;
    @Autowired UserRepository userRepository;

    Long clientId;
    Long productId;

    @BeforeEach
    void setup() {
        // Setup initial data
        if (clientRepository.count() == 0) {
            Client client = clientRepository.save(Client.builder().name("Test Client").code("TEST-C").build());
            clientId = client.getId();

            Product product = productRepository.save(Product.builder().name("Test Product").code("TEST-P").build());
            productId = product.getId();
            
            // Ensure admin user exists for 'createdBy' mapping if using real DB, 
            // but @WithMockUser should handle security context. 
            // However, our service looks up user by username from DB.
            userRepository.save(User.builder()
                    .username("admin")
                    .displayName("Admin User")
                    .active(true)
                    .build());
        } else {
            clientId = clientRepository.findAll().get(0).getId();
            productId = productRepository.findAll().get(0).getId();
        }
    }

    @Test
    @WithMockUser(username = "admin", roles = {"USER"})
    void shouldRegisterJobAndSamples() throws Exception {
        SampleRegistrationRequest request = new SampleRegistrationRequest();
        request.setClientId(clientId);
        request.setProjectName("Test Project");
        request.setPriority("URGENT");
        
        SampleRegistrationRequest.SampleItem item = new SampleRegistrationRequest.SampleItem();
        item.setProductId(productId);
        item.setDescription("Sample 1");
        item.setSamplingPoint("Point A");
        item.setSampledBy("Tester");
        item.setSampledAt(Instant.now());
        
        request.setSamples(List.of(item));

        mockMvc.perform(post("/api/samples/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.jobNumber").exists())
                .andExpect(jsonPath("$.samples", hasSize(1)))
                .andExpect(jsonPath("$.samples[0].sampleNumber").exists())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"USER"})
    void shouldListSamples() throws Exception {
        mockMvc.perform(get("/api/samples"))
                .andExpect(status().isOk());
    }
}
