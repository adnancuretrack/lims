package com.lims.module.sample.controller;

import com.lims.module.sample.entity.SectionTemplate;
import com.lims.module.sample.repository.SectionTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/section-templates")
@RequiredArgsConstructor
public class SectionTemplateController {

    private final SectionTemplateRepository sectionTemplateRepository;

    @GetMapping
    public ResponseEntity<List<SectionTemplate>> getAll() {
        return ResponseEntity.ok(sectionTemplateRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SectionTemplate> saveTemplate(@RequestBody SectionTemplate template) {
        return ResponseEntity.ok(sectionTemplateRepository.save(template));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        sectionTemplateRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
