package com.lims.module.investigation.repository;

import com.lims.module.investigation.entity.Investigation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvestigationRepository extends JpaRepository<Investigation, Long> {

    @Query("SELECT i FROM Investigation i ORDER BY i.createdAt DESC")
    List<Investigation> findAllByOrderByCreatedAtDesc();

    List<Investigation> findByStatus(String status);

    List<Investigation> findByAssignedToId(Long userId);

    Optional<Investigation> findByNcrNumber(String ncrNumber);

    @Query("SELECT COUNT(i) FROM Investigation i WHERE i.status != 'CLOSED'")
    long countOpenInvestigations();
}
