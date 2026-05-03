export function buildErrorMapper(): string {
  return `
  function mapSubmissionError(error: unknown): Record<string, string> {
    if (typeof error === "object" && error && "fieldErrors" in error) {
      return (error as { fieldErrors: Record<string, string> }).fieldErrors;
    }

    return { form: "Unable to submit form." };
  }
  `.trim();
}
