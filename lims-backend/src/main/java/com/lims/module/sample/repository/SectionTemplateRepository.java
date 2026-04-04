package com.lims.module.sample.repository;

import com.lims.module.sample.entity.SectionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SectionTemplateRepository extends JpaRepository<SectionTemplate, Long> {
    List<SectionTemplate> findByCategory(String category);
}
