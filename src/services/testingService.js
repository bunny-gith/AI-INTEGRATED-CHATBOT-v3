const geminiService = require('./chatgptService');
const medicineService = require('./medicineService');
const vaccinationService = require('./vaccinationService');
const healthWorkerService = require('./healthWorkerService');
const outbreakService = require('./outbreakService');
const database = require('../config/database');

class TestingService {
  constructor() {
    this.testResults = [];
    this.accuracyThreshold = 0.8; // 80% target
  }

  // Test cases for different bot functionalities
  getTestCases() {
    return {
      symptom_checker: [
        {
          input: "I have fever and headache for 2 days",
          expected_keywords: ["fever", "headache", "medical attention", "doctor"],
          category: "common_symptoms"
        },
        {
          input: "Severe chest pain and difficulty breathing",
          expected_keywords: ["emergency", "ambulance", "immediate", "hospital"],
          category: "emergency"
        },
        {
          input: "Mild cough and runny nose",
          expected_keywords: ["cold", "rest", "hydration", "recovery"],
          category: "mild_illness"
        }
      ],
      medicine_info: [
        {
          input: "Paracetamol",
          expected_keywords: ["fever", "pain", "dosage", "precautions"],
          category: "common_medicine"
        },
        {
          input: "Aspirin",
          expected_keywords: ["pain", "blood thinner", "stomach", "doctor"],
          category: "medicine_with_warnings"
        }
      ],
      vaccination: [
        {
          input: "BEN001",
          expected_keywords: ["vaccination", "status", "completed", "schedule"],
          category: "vaccination_lookup"
        }
      ],
      health_worker: [
        {
          input: "110001",
          expected_keywords: ["doctor", "hospital", "contact", "health"],
          category: "health_worker_search"
        }
      ],
      outbreak: [
        {
          input: "Delhi",
          expected_keywords: ["outbreak", "disease", "prevention", "health"],
          category: "outbreak_info"
        }
      ]
    };
  }

  // Run accuracy test for a specific category
  async runAccuracyTest(category, testCases = null) {
    const cases = testCases || this.getTestCases()[category];
    if (!cases) {
      throw new Error(`Unknown test category: ${category}`);
    }

    const results = {
      category: category,
      total_tests: cases.length,
      passed: 0,
      failed: 0,
      accuracy: 0,
      details: []
    };

    for (const testCase of cases) {
      try {
        const response = await this.getBotResponse(category, testCase.input);
        const score = this.evaluateResponse(response, testCase.expected_keywords);

        const testResult = {
          input: testCase.input,
          response: response.substring(0, 200) + '...', // Truncate for storage
          expected_keywords: testCase.expected_keywords,
          score: score,
          passed: score >= 0.7, // 70% keyword match threshold
          category: testCase.category
        };

        results.details.push(testResult);

        if (testResult.passed) {
          results.passed++;
        } else {
          results.failed++;
        }

        // Store in database
        await this.storeTestResult(testResult);

      } catch (error) {
        console.error(`Test failed for input: ${testCase.input}`, error);
        results.failed++;
        results.details.push({
          input: testCase.input,
          error: error.message,
          passed: false
        });
      }
    }

    results.accuracy = results.total_tests > 0 ? results.passed / results.total_tests : 0;
    return results;
  }

  // Get bot response for different categories
  async getBotResponse(category, input) {
    switch (category) {
      case 'symptom_checker':
        const aiResponse = await geminiService.getAIResponse(input, 'en');
        return typeof aiResponse === 'object' ? aiResponse.text : aiResponse;
      case 'medicine_info':
        return await medicineService.searchMedicine(input, 'en');
      case 'vaccination':
        const status = await vaccinationService.getVaccinationStatus(input);
        return status ? vaccinationService.formatVaccinationStatus(status, 'en') : 'Beneficiary not found';
      case 'health_worker':
        return await healthWorkerService.findHealthWorkers(input, 'en');
      case 'outbreak':
        return await outbreakService.getOutbreakInfoForUser(null, null, input, 'en');
      default:
        throw new Error(`Unsupported category: ${category}`);
    }
  }

  // Evaluate response accuracy based on keyword matching
  evaluateResponse(response, expectedKeywords) {
    if (!response || !expectedKeywords) return 0;

    const normalizedResponse = typeof response === 'object' ? response.text || '' : String(response);
    const responseLower = normalizedResponse.toLowerCase();
    let matchedKeywords = 0;

    for (const keyword of expectedKeywords) {
      if (responseLower.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    }

    return expectedKeywords.length > 0 ? matchedKeywords / expectedKeywords.length : 0;
  }

  // Store test result in database
  async storeTestResult(result) {
    try {
      await database.run(
        `INSERT INTO test_results
         (category, input_text, response_text, expected_keywords, score, passed, test_date)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          result.category,
          result.input,
          result.response,
          JSON.stringify(result.expected_keywords),
          result.score,
          result.passed ? 1 : 0
        ]
      );
    } catch (error) {
      console.error('Error storing test result:', error);
    }
  }

  // Run comprehensive accuracy test
  async runComprehensiveTest() {
    const categories = Object.keys(this.getTestCases());
    const overallResults = {
      total_categories: categories.length,
      categories_tested: 0,
      overall_accuracy: 0,
      category_results: [],
      timestamp: new Date().toISOString()
    };

    let totalAccuracy = 0;

    for (const category of categories) {
      try {
        console.log(`Running tests for category: ${category}`);
        const categoryResult = await this.runAccuracyTest(category);
        overallResults.category_results.push(categoryResult);
        totalAccuracy += categoryResult.accuracy;
        overallResults.categories_tested++;
      } catch (error) {
        console.error(`Failed to test category ${category}:`, error);
        overallResults.category_results.push({
          category: category,
          error: error.message,
          accuracy: 0
        });
      }
    }

    overallResults.overall_accuracy = overallResults.categories_tested > 0 ?
      totalAccuracy / overallResults.categories_tested : 0;

    // Store overall results
    await this.storeOverallResults(overallResults);

    return overallResults;
  }

  // Store overall test results
  async storeOverallResults(results) {
    try {
      await database.run(
        `INSERT INTO test_runs
         (overall_accuracy, categories_tested, total_categories, results_json, test_date)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [
          results.overall_accuracy,
          results.categories_tested,
          results.total_categories,
          JSON.stringify(results)
        ]
      );
    } catch (error) {
      console.error('Error storing overall test results:', error);
    }
  }

  // Get testing statistics
  async getTestingStats(days = 30) {
    try {
      const stats = await database.get(
        `SELECT
          COUNT(*) as total_tests,
          AVG(score) as avg_accuracy,
          SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_tests,
          SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) as failed_tests
         FROM test_results
         WHERE test_date >= datetime('now', '-${days} days')`,
        []
      );

      const recentRuns = await database.all(
        `SELECT overall_accuracy, test_date
         FROM test_runs
         ORDER BY test_date DESC LIMIT 10`,
        []
      );

      return {
        period_days: days,
        total_tests: stats.total_tests || 0,
        average_accuracy: stats.avg_accuracy || 0,
        passed_tests: stats.passed_tests || 0,
        failed_tests: stats.failed_tests || 0,
        success_rate: stats.total_tests > 0 ? stats.passed_tests / stats.total_tests : 0,
        recent_runs: recentRuns
      };
    } catch (error) {
      console.error('Error getting testing stats:', error);
      return null;
    }
  }

  // Check if accuracy target is met
  isAccuracyTargetMet(stats) {
    return stats && stats.average_accuracy >= this.accuracyThreshold;
  }
}

module.exports = new TestingService();
