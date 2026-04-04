package com.lims.module.sample.repository;

import com.lims.module.sample.entity.MethodDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MethodDefinitionRepository extends JpaRepository<MethodDefinition, Long> {
    
    List<MethodDefinition> findByTestMethodIdOrderByVersionDesc(Long testMethodId);
    
    Optional<MethodDefinition> findByTestMethodIdAndVersion(Long testMethodId, Integer version);
    
    Optional<MethodDefinition> findByTestMethodIdAndStatus(Long testMethodId, String status);
}
