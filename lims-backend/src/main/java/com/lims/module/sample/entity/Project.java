package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Project extends BaseEntity {

    @Column(name = "project_number", nullable = false, unique = true, length = 50)
    private String projectNumber;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(length = 200)
    private String location;

    @Column(length = 100)
    private String owner;

    @Column(length = 100)
    private String consultant;

    @Column(length = 100)
    private String contractor;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
