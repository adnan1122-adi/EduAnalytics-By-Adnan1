import { GoogleGenAI } from "@google/genai";
import { AnalysisSummary, ComponentStat, ActionPlanResponse, FullAnalysis } from '../types';

export const generateEducationalActionPlan = async (
  analysis: FullAnalysis
): Promise<ActionPlanResponse> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Role: Educational Data Analyst Expert.
    Task: Analyze the following academic data summary and generate specific, actionable educational plans.
    
    Data Summary:
    - Overall Mean Score: ${analysis.summary.mean.toFixed(1)}%
    - Standard Deviation: ${analysis.summary.stdDev.toFixed(1)}
    - Pass Rate: ${((analysis.summary.passCount / (analysis.summary.passCount + analysis.summary.failCount)) * 100).toFixed(1)}%
    - Failing Students: ${analysis.summary.failCount}
    - Strongest Component: ${analysis.strongestComponent}
    - Weakest Component: ${analysis.weakestComponent}
    
    Component Details (Correlation with Final Grade):
    ${analysis.componentStats.map(c => `- ${c.name}: Mean ${c.mean.toFixed(1)}, Correlation ${c.correlationWithTotal.toFixed(2)}`).join('\n')}

    Please output a JSON object with the following keys. Each value should be a detailed Markdown string.
    1. "highAchieverPlan": Enrichment, competitions, leadership.
    2. "averageStudentPlan": Consolidation, practice, movement to next level.
    3. "atRiskPlan": Remediation, parent intervention, foundational steps.
    4. "teacherActions": Pedagogy changes, grouping strategies, what to reteach next week.
    5. "hodInsights": Curriculum gaps, teacher PD needs, strategic changes for the department.

    Make the advice specific to the data provided (e.g., if correlation is high for a specific component, mention it).
    Ensure the JSON is valid. Do not wrap in markdown code blocks. Just the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as ActionPlanResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate action plan.");
  }
};