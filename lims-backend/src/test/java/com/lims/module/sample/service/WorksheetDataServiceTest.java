package com.lims.module.sample.service;

import com.lims.module.sample.entity.MethodDefinition;
import com.lims.module.sample.entity.SampleTest;
import com.lims.module.sample.entity.TestMethod;
import com.lims.module.sample.entity.WorksheetData;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.sample.repository.WorksheetDataRepository;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.service.DataSyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorksheetDataServiceTest {

    @Mock private WorksheetDataRepository worksheetDataRepository;
    @Mock private SampleTestRepository sampleTestRepository;
    @Mock private TestResultRepository testResultRepository;
    @Mock private SampleRepository sampleRepository;
    @Mock private UserRepository userRepository;
    @Mock private DataSyncService dataSyncService;
    @Mock private MethodDefinitionService methodDefinitionService;

    private WorksheetDataService worksheetDataService;

    @BeforeEach
    void setUp() {
        worksheetDataService = new WorksheetDataService(
                worksheetDataRepository,
                sampleTestRepository,
                testResultRepository,
                sampleRepository,
                userRepository,
                dataSyncService,
                methodDefinitionService
        );
    }

    @Test
    void shouldCreateWorksheetDataWithMethodDefinitionWhenNotFound() {
        // Arrange
        Long sampleTestId = 1L;
        Long testMethodId = 10L;
        
        TestMethod testMethod = new TestMethod();
        testMethod.setId(testMethodId);
        
        SampleTest sampleTest = new SampleTest();
        sampleTest.setId(sampleTestId);
        sampleTest.setTestMethod(testMethod);
        
        MethodDefinition activeDef = new MethodDefinition();
        activeDef.setId(100L);
        activeDef.setSchemaDefinition(Map.of("fields", "[]"));

        when(sampleTestRepository.findById(sampleTestId)).thenReturn(Optional.of(sampleTest));
        when(methodDefinitionService.getActiveDefinitionEntity(testMethodId)).thenReturn(activeDef);
        when(worksheetDataRepository.findBySampleTestId(sampleTestId)).thenReturn(Optional.empty());
        
        // Mock save to return the saved object (simulating DB assigning ID)
        when(worksheetDataRepository.save(any(WorksheetData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Map<String, Object> result = worksheetDataService.getWorksheet(sampleTestId);

        // Assert
        assertNotNull(result);
        assertEquals("DRAFT", result.get("status"));
        
        ArgumentCaptor<WorksheetData> captor = ArgumentCaptor.forClass(WorksheetData.class);
        verify(worksheetDataRepository).save(captor.capture());
        
        WorksheetData savedWd = captor.getValue();
        assertEquals(sampleTest, savedWd.getSampleTest());
        assertEquals(activeDef, savedWd.getMethodDefinition()); // Verify the fix
        assertEquals("DRAFT", savedWd.getStatus());
    }

    @Test
    void shouldPrefillHeaderDataFromSystemMapping() {
        // Arrange
        Long sampleTestId = 1L;
        Long testMethodId = 10L;
        
        com.lims.module.sample.entity.Job job = new com.lims.module.sample.entity.Job();
        job.setJobNumber("JOB-001");
        
        com.lims.module.sample.entity.Sample sample = new com.lims.module.sample.entity.Sample();
        sample.setSampleNumber("SAM-001");
        sample.setJob(job);
        
        TestMethod testMethod = new TestMethod();
        testMethod.setId(testMethodId);
        
        SampleTest sampleTest = new SampleTest();
        sampleTest.setId(sampleTestId);
        sampleTest.setTestMethod(testMethod);
        sampleTest.setSample(sample);
        
        MethodDefinition activeDef = new MethodDefinition();
        activeDef.setId(100L);
        activeDef.setSchemaDefinition(Map.of(
            "headerFields", java.util.List.of(
                Map.of("id", "h1", "label", "Sample ID", "systemMapping", "sample.sampleNumber"),
                Map.of("id", "h2", "label", "Job ID", "systemMapping", "sample.job.jobNumber")
            )
        ));

        when(sampleTestRepository.findById(sampleTestId)).thenReturn(Optional.of(sampleTest));
        when(methodDefinitionService.getActiveDefinitionEntity(testMethodId)).thenReturn(activeDef);
        when(worksheetDataRepository.findBySampleTestId(sampleTestId)).thenReturn(Optional.empty());
        when(worksheetDataRepository.save(any(WorksheetData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        worksheetDataService.getWorksheet(sampleTestId);

        // Assert
        ArgumentCaptor<WorksheetData> captor = ArgumentCaptor.forClass(WorksheetData.class);
        verify(worksheetDataRepository).save(captor.capture());
        
        WorksheetData savedWd = captor.getValue();
        Map<String, Object> data = savedWd.getData();
        assertNotNull(data.get("header"));
        Map<String, Object> header = (Map<String, Object>) data.get("header");
        assertEquals("SAM-001", header.get("h1"));
        assertEquals("JOB-001", header.get("h2"));
    }
}
