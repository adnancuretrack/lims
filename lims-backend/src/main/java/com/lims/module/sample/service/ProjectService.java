package com.lims.module.sample.service;

import com.lims.module.sample.dto.ProjectDTO;
import com.lims.module.sample.entity.Client;
import com.lims.module.sample.entity.Project;
import com.lims.module.sample.repository.ClientRepository;
import com.lims.module.sample.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;

    @Transactional
    public ProjectDTO createProject(ProjectDTO dto) {
        if (projectRepository.existsByProjectNumber(dto.getProjectNumber())) {
            throw new RuntimeException("Project number already exists: " + dto.getProjectNumber());
        }

        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = Project.builder()
                .projectNumber(dto.getProjectNumber())
                .name(dto.getName())
                .client(client)
                .location(dto.getLocation())
                .owner(dto.getOwner())
                .consultant(dto.getConsultant())
                .contractor(dto.getContractor())
                .contactPerson(dto.getContactPerson())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .active(true)
                .build();

        return mapToDTO(projectRepository.save(project));
    }

    @Transactional
    public ProjectDTO updateProject(Long id, ProjectDTO dto) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setName(dto.getName());
        project.setLocation(dto.getLocation());
        project.setOwner(dto.getOwner());
        project.setConsultant(dto.getConsultant());
        project.setContractor(dto.getContractor());
        project.setContactPerson(dto.getContactPerson());
        project.setEmail(dto.getEmail());
        project.setPhone(dto.getPhone());
        project.setActive(dto.isActive());
        
        // Don't allow changing client or project number for now to keep it simple

        return mapToDTO(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getProjectsByClient(Long clientId) {
        return projectRepository.findByClientIdAndActiveTrue(clientId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private ProjectDTO mapToDTO(Project project) {
        return ProjectDTO.builder()
                .id(project.getId())
                .projectNumber(project.getProjectNumber())
                .name(project.getName())
                .clientId(project.getClient().getId())
                .clientName(project.getClient().getName())
                .location(project.getLocation())
                .owner(project.getOwner())
                .consultant(project.getConsultant())
                .contractor(project.getContractor())
                .contactPerson(project.getContactPerson())
                .email(project.getEmail())
                .phone(project.getPhone())
                .active(project.isActive())
                .build();
    }
}
