package com.lims.module.sample.repository;

import com.lims.module.sample.entity.CoaRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoaRevisionRepository extends JpaRepository<CoaRevision, Long> {
    List<CoaRevision> findBySampleIdOrderByRevisionNumberDesc(Long sampleId);
    Optional<CoaRevision> findTopBySampleIdOrderByRevisionNumberDesc(Long sampleId);
    int countBySampleId(Long sampleId);
}
