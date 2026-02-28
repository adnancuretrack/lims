package com.lims.module.sample.controller;

import com.lims.module.sample.entity.Client;
import com.lims.module.sample.entity.Product;
import com.lims.module.sample.entity.TestMethod;
import com.lims.module.sample.dto.ProductTestDTO;
import com.lims.module.sample.service.LookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lookup")
@RequiredArgsConstructor
@Tag(name = "Lookup", description = "Reference data lookup endpoints")
public class LookupController {

    private final LookupService lookupService;

    @GetMapping("/clients")
    @Operation(summary = "Get active clients")
    public List<Client> getClients() {
        return lookupService.getActiveClients();
    }

    @GetMapping("/products")
    @Operation(summary = "Get active products")
    public List<Product> getProducts() {
        return lookupService.getActiveProducts();
    }

    @PostMapping("/clients")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create client (Admin only)")
    public Client createClient(@RequestBody Client client) {
        return lookupService.createClient(client);
    }

    @PutMapping("/clients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update client (Admin only)")
    public Client updateClient(@PathVariable Long id, @RequestBody Client client) {
        return lookupService.updateClient(id, client);
    }

    @PostMapping("/products")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create product (Admin only)")
    public Product createProduct(@RequestBody Product product) {
        return lookupService.createProduct(product);
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update product (Admin only)")
    public Product updateProduct(@PathVariable Long id, @RequestBody Product product) {
        return lookupService.updateProduct(id, product);
    }

    @GetMapping("/test-methods")
    @Operation(summary = "Get active test methods")
    public List<TestMethod> getTestMethods() {
        return lookupService.getActiveTestMethods();
    }

    @PostMapping("/test-methods")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create test method (Admin only)")
    public TestMethod createTestMethod(@RequestBody TestMethod testMethod) {
        return lookupService.createTestMethod(testMethod);
    }

    @PutMapping("/test-methods/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update test method (Admin only)")
    public TestMethod updateTestMethod(@PathVariable Long id, @RequestBody TestMethod testMethod) {
        return lookupService.updateTestMethod(id, testMethod);
    }

    @GetMapping("/products/{id}/tests")
    @Operation(summary = "Get tests assigned to a product")
    public List<ProductTestDTO> getProductTests(@PathVariable Long id) {
        return lookupService.getTestsForProduct(id);
    }

    @PostMapping("/products/{id}/tests")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign tests to a product (Admin only)")
    public void assignProductTests(@PathVariable Long id, @RequestBody List<Long> testMethodIds) {
        lookupService.assignTestsToProduct(id, testMethodIds);
    }
}
