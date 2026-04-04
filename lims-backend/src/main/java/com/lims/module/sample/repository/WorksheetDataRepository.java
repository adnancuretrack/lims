package com.lims.module.sample.repository;

import com.lims.module.sample.entity.WorksheetData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorksheetDataRepository extends JpaRepository<WorksheetData, Long> {
    
    Optional<WorksheetData> findBySampleTestId(Long sampleTestId);
}
