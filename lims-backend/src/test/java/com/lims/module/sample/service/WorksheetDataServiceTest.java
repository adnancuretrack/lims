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
}
