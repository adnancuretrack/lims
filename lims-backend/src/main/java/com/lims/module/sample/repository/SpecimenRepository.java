package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Specimen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecimenRepository extends JpaRepository<Specimen, Long>, JpaSpecificationExecutor<Specimen> {
    List<Specimen> findBySampleIdOrderBySpecimenNumberAsc(Long sampleId);
    List<Specimen> findBySampleIdAndStatus(Long sampleId, String status);
    Optional<Specimen> findBySampleIdAndSpecimenNumber(Long sampleId, Integer specimenNumber);
    long countBySampleIdAndStatus(Long sampleId, String status);
    long countBySampleId(Long sampleId);
}
