package com.lims.common.repository;

import com.lims.common.entity.SystemSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemSequenceRepository extends JpaRepository<SystemSequence, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SystemSequence s WHERE s.prefix = :prefix AND s.year = :year")
    Optional<SystemSequence> findAndLockByPrefixAndYear(@Param("prefix") String prefix, @Param("year") int year);
}
