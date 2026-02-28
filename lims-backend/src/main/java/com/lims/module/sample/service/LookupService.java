package com.lims.module.sample.service;

import com.lims.module.sample.entity.Client;
import com.lims.module.sample.entity.Product;
import com.lims.module.sample.entity.ProductTest;
import com.lims.module.sample.entity.ProductTestId;
import com.lims.module.sample.entity.TestMethod;
import com.lims.module.sample.repository.ClientRepository;
import com.lims.module.sample.repository.ProductRepository;
import com.lims.module.sample.repository.ProductTestRepository;
import com.lims.module.sample.repository.TestMethodRepository;
import com.lims.module.sample.dto.ProductTestDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LookupService {

    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final TestMethodRepository testMethodRepository;
    private final ProductTestRepository productTestRepository;

    @Transactional(readOnly = true)
    public List<Client> getActiveClients() {
        return clientRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<Product> getActiveProducts() {
        return productRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public Client createClient(Client client) {
        return clientRepository.save(client);
    }

    @Transactional
    public Client updateClient(Long id, Client updatedClient) {
        Client existing = clientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Client not found"));
        
        existing.setName(updatedClient.getName());
        existing.setCode(updatedClient.getCode());
        existing.setContactPerson(updatedClient.getContactPerson());
        existing.setEmail(updatedClient.getEmail());
        existing.setPhone(updatedClient.getPhone());
        existing.setAddress(updatedClient.getAddress());
        existing.setActive(updatedClient.isActive());
        
        return clientRepository.save(existing);
    }

    @Transactional
    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        existing.setName(updatedProduct.getName());
        existing.setCode(updatedProduct.getCode());
        existing.setCategory(updatedProduct.getCategory());
        existing.setSamplingInstructions(updatedProduct.getSamplingInstructions());
        existing.setActive(updatedProduct.isActive());

        return productRepository.save(existing);
    }

    @Transactional(readOnly = true)
    public List<TestMethod> getActiveTestMethods() {
        return testMethodRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public TestMethod createTestMethod(TestMethod testMethod) {
        return testMethodRepository.save(testMethod);
    }

    @Transactional
    public TestMethod updateTestMethod(Long id, TestMethod updatedTestMethod) {
        TestMethod existing = testMethodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test Method not found"));

        existing.setName(updatedTestMethod.getName());
        existing.setCode(updatedTestMethod.getCode());
        existing.setStandardRef(updatedTestMethod.getStandardRef());
        existing.setResultType(updatedTestMethod.getResultType());
        existing.setUnit(updatedTestMethod.getUnit());
        existing.setDecimalPlaces(updatedTestMethod.getDecimalPlaces());
        existing.setMinLimit(updatedTestMethod.getMinLimit());
        existing.setMaxLimit(updatedTestMethod.getMaxLimit());
        existing.setTatHours(updatedTestMethod.getTatHours());
        existing.setActive(updatedTestMethod.isActive());


        return testMethodRepository.save(existing);
    }

    @Transactional(readOnly = true)
    public List<ProductTestDTO> getTestsForProduct(Long productId) {
        return productTestRepository.findByProductId(productId).stream()
                .map(pt -> ProductTestDTO.builder()
                        .testMethodId(pt.getTestMethod().getId())
                        .testMethodName(pt.getTestMethod().getName())
                        .testMethodCode(pt.getTestMethod().getCode())
                        .mandatory(pt.isMandatory())
                        .sortOrder(pt.getSortOrder())
                        .build())
                .toList();
    }

    @Transactional
    public void assignTestsToProduct(Long productId, List<Long> testMethodIds) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        productTestRepository.deleteByProductId(productId);

        for (int i = 0; i < testMethodIds.size(); i++) {
            Long testId = testMethodIds.get(i);
            TestMethod tm = testMethodRepository.findById(testId)
                    .orElseThrow(() -> new RuntimeException("Test Method not found: " + testId));

            ProductTest pt = ProductTest.builder()
                    .id(new ProductTestId(productId, testId))
                    .product(product)
                    .testMethod(tm)
                    .mandatory(true)
                    .sortOrder(i + 1)
                    .build();
            productTestRepository.save(pt);
        }
    }
}
