import { z } from "zod";

export const MAX_TITLE = 80;
export const MAX_LABEL = 60;

const StepSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().max(MAX_LABEL),
  })
  .strict();

export const SequenceInputSchema = z
  .object({
    title: z.string().min(1).max(MAX_TITLE),
    participants: z.array(z.string().min(1)).min(2).max(12),
    steps: z.array(StepSchema).min(1).max(40),
  })
  .strict()
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.participants.forEach((p, i) => {
      if (seen.has(p)) {
        ctx.addIssue({
          code: "custom",
          path: ["participants", i],
          message: `Duplicate participant "${p}"`,
        });
      }
      seen.add(p);
    });
    input.steps.forEach((step, i) => {
      for (const key of ["from", "to"] as const) {
        if (!seen.has(step[key])) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", i, key],
            message: `"${step[key]}" is not listed in participants`,
          });
        }
      }
    });
  });

export type SequenceInput = z.infer<typeof SequenceInputSchema>;
