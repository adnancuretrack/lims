package com.lims.module.sample.repository;

import com.lims.module.sample.entity.ResultReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResultReviewRepository extends JpaRepository<ResultReview, Long> {
    List<ResultReview> findByTestResultIdOrderByReviewedAtAsc(Long testResultId);
}
