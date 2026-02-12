package com.lims.config;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

/**
 * Custom revision entity for Hibernate Envers audit trail.
 * Extends the default revision with username and optional change reason.
 */
@Entity
@Table(name = "revinfo")
@RevisionEntity(AuditRevisionListener.class)
@Getter
@Setter
public class AuditRevisionEntity extends DefaultRevisionEntity {

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "change_reason")
    private String changeReason;

    @Column(name = "ip_address")
    private String ipAddress;
}
