import { useState } from 'react';
import { Button, Space, Modal, Input, message, Typography } from 'antd';
import { SafetyCertificateOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { AnalysisService } from '../../api/AnalysisService';
import type { SampleTestDTO, ResultReviewRequest } from '../../api/types';

const { TextArea } = Input;
const { Text } = Typography;

interface ReviewActionPanelProps {
    sampleId: number;
    sampleNumber: string;
    tests: SampleTestDTO[];
    onSuccess: () => void;
}

export function ReviewActionPanel({ sampleNumber, tests, onSuccess }: ReviewActionPanelProps) {
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [reviewAction, setReviewAction] = useState<'AUTHORIZE' | 'REJECT' | null>(null);
    const [reviewComment, setReviewComment] = useState('');

    const reviewMutation = useMutation({
        mutationFn: AnalysisService.reviewResult,
        onSuccess: () => {
            message.success(`Result ${reviewAction?.toLowerCase()}d successfully`);
            setIsReviewModalVisible(false);
            setReviewComment('');
            onSuccess();
        },
        onError: () => message.error('Failed to complete review')
    });

    const handleReviewClick = (action: 'AUTHORIZE' | 'REJECT') => {
        setReviewAction(action);
        setIsReviewModalVisible(true);
    };

    const submitReview = () => {
        const completedTests = tests.filter(t => t.status === 'COMPLETED');

        if (completedTests.length === 0) {
            message.warning('No completed tests found to review');
            setIsReviewModalVisible(false);
            return;
        }

        // Apply action to all completed tests for this sample
        // Since we don't have bulk review API yet, we'll iterate
        let pending = completedTests.length;
        let success = true;

        completedTests.forEach(test => {
            if (test.testResultId) {
                const request: ResultReviewRequest = {
                    testResultId: test.testResultId,
                    action: reviewAction!,
                    comment: reviewComment
                };
                AnalysisService.reviewResult(request).then(() => {
                    pending--;
                    if (pending === 0 && success) {
                        message.success(`Sample results ${reviewAction?.toLowerCase()}d successfully`);
                        setIsReviewModalVisible(false);
                        setReviewComment('');
                        onSuccess();
                    }
                }).catch(() => {
                    if (success) {
                        message.error('Failed to complete review');
                        success = false;
                    }
                });
            } else {
                pending--;
                if (pending === 0 && success) {
                    message.success(`Sample results ${reviewAction?.toLowerCase()}d successfully`);
                    setIsReviewModalVisible(false);
                    setReviewComment('');
                    onSuccess();
                }
            }
        });
    };

    return (
        <>
            <Space>
                <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => handleReviewClick('AUTHORIZE')}
                >
                    Authorize Sample
                </Button>
                <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleReviewClick('REJECT')}
                >
                    Reject Changes
                </Button>
            </Space>

            <Modal
                title={reviewAction === 'AUTHORIZE' ? "Confirm Authorization" : "Reject Results"}
                open={isReviewModalVisible}
                onOk={submitReview}
                onCancel={() => setIsReviewModalVisible(false)}
                okText={reviewAction === 'AUTHORIZE' ? "Authorize" : "Reject"}
                okButtonProps={{
                    danger: reviewAction === 'REJECT',
                    style: reviewAction === 'AUTHORIZE' ? { background: '#52c41a', borderColor: '#52c41a' } : {}
                }}
                confirmLoading={reviewMutation.isPending}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>
                        {reviewAction === 'AUTHORIZE'
                            ? `You are about to authorize results for ${sampleNumber} as technically valid.`
                            : `Please provide a reason for rejecting ${sampleNumber}. This will return the sample for re-testing.`}
                    </Text>
                </div>
                <TextArea
                    rows={4}
                    placeholder="Add comments or justification..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                />
            </Modal>
        </>
    );
}
