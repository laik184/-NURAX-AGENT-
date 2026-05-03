import type { FormSchema } from "../types.js";

export function buildSubmitHandler(schema: FormSchema): string {
  return `
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      await submitToApi(payload);
      setErrors({});
      setSuccess(true);
    } catch (error) {
      setErrors(mapSubmissionError(error));
    } finally {
      setLoading(false);
    }
  }
  `.trim();
}
