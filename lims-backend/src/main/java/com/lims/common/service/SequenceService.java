package com.lims.common.service;

import com.lims.common.entity.SystemSequence;
import com.lims.common.repository.SystemSequenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

@Service
@RequiredArgsConstructor
public class SequenceService {

    private final SystemSequenceRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String getNextJobNumber() {
        int year = Year.now().getValue();
        SystemSequence seq = repository.findAndLockByPrefixAndYear("JOB", year)
                .orElseGet(() -> {
                    // Auto-create row for a new year
                    SystemSequence s = new SystemSequence();
                    s.setPrefix("JOB");
                    s.setYear(year);
                    s.setCurrentVal(0L);
                    return repository.save(s);
                });

        seq.setCurrentVal(seq.getCurrentVal() + 1);
        repository.save(seq);

        long val = seq.getCurrentVal();
        char letter = (char) ('a' + val / 10000);
        int number = (int) (val % 10000);

        if (letter > 'z') {
            throw new IllegalStateException("Job number capacity exceeded for year " + year);
        }

        return "J" + year + "-" + letter + String.format("%04d", number);
    }
}
