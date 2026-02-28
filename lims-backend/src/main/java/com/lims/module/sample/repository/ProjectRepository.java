package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByClientIdAndActiveTrue(Long clientId);
    List<Project> findByActiveTrue();
    boolean existsByProjectNumber(String projectNumber);
}
