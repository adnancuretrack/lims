package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
    Optional<Job> findByJobNumber(String jobNumber);
    Page<Job> findByOrderByCreatedAtDesc(Pageable pageable);
}
