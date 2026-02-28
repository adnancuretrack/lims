package com.lims.module.sample.controller;

import com.lims.module.sample.dto.ResultReviewRequest;
import com.lims.module.sample.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/review")
@RequiredArgsConstructor
@Tag(name = "Review", description = "Laboratory result review and authorization endpoints")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/authorize")
    @PreAuthorize("hasAnyRole('ADMIN', 'REVIEWER', 'AUTHORIZER')")
    @Operation(summary = "Review and authorize/reject a result")
    public void authorize(@RequestBody ResultReviewRequest request) {
        reviewService.reviewResult(request);
    }
}
