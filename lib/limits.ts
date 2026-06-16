export const LIMITS = {
  FREE: {
    maxFileSizeBytes:        300 * 1024 * 1024,  // 300MB
    practiceTestsPerMonth:      1,
    questionsPerTest:          40,
    aiSummary:                 "basic",
    simplifiedExplanations:    false,
    youtubeRecommendations:     false,
    advancedAnalytics:         false,
    gamification:              false,
    studyReminders:            false,
    priorityProcessing:        false,
  },
  STANDARD: {
    maxFileSizeBytes:        500 * 1024 * 1024,  // 500MB
    practiceTestsPerMonth:     10,
    questionsPerTest:          100,
    aiSummary:                 "full",
    simplifiedExplanations:    true,
    youtubeRecommendations:     true,
    advancedAnalytics:         false,
    gamification:              false,
    studyReminders:            false,
    priorityProcessing:        false,
  },
  PREMIUM: {
    maxFileSizeBytes:        1024 * 1024 * 1024, // 1GB
    practiceTestsPerMonth:    Infinity,
    questionsPerTest:         Infinity,
    aiSummary:                 "full",
    simplifiedExplanations:    true,
    youtubeRecommendations:     true,
    advancedAnalytics:         true,
    gamification:              true,
    studyReminders:            true,
    priorityProcessing:        true,
  },
} as const;

export type TierKey = keyof typeof LIMITS;
