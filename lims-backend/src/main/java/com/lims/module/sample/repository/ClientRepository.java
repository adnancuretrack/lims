package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByCode(String code);
    Optional<Client> findByName(String name);
    List<Client> findByActiveTrueOrderByNameAsc();
}
