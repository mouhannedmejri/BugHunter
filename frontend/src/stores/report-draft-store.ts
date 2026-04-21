import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReportDraft } from "@/lib/report-mock-data";
import { emptyDraft } from "@/lib/report-mock-data";

interface ReportDraftState {
  draft: ReportDraft;
  currentStep: number;
  hasSavedDraft: boolean;
  setField: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
  setStep: (step: number) => void;
  addAttachment: (file: { id: string; name: string; size: number; type: string }) => void;
  removeAttachment: (id: string) => void;
  updateAttachmentProgress: (id: string, progress: number) => void;
  restoreDraft: () => void;
  clearDraft: () => void;
  initDraft: (programSlug: string) => void;
}

export const useReportDraftStore = create<ReportDraftState>()(
  persist(
    (set, get) => ({
      draft: { ...emptyDraft },
      currentStep: 0,
      hasSavedDraft: false,

      setField: (key, value) =>
        set((state) => ({
          draft: { ...state.draft, [key]: value },
          hasSavedDraft: true,
        })),

      setStep: (step) => set({ currentStep: step }),

      addAttachment: (file) =>
        set((state) => ({
          draft: {
            ...state.draft,
            attachments: [...state.draft.attachments, { ...file, progress: 0, scanStatus: "pending" as const }],
          },
        })),

      removeAttachment: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            attachments: state.draft.attachments.filter((a) => a.id !== id),
          },
        })),

      updateAttachmentProgress: (id, progress) =>
        set((state) => ({
          draft: {
            ...state.draft,
            attachments: state.draft.attachments.map((a) =>
              a.id === id ? { ...a, progress, scanStatus: progress >= 100 ? ("clean" as const) : ("pending" as const) } : a
            ),
          },
        })),

      restoreDraft: () => set({ hasSavedDraft: true }),

      clearDraft: () => set({ draft: { ...emptyDraft }, currentStep: 0, hasSavedDraft: false }),

      initDraft: (programSlug) => {
        const state = get();
        if (state.draft.programSlug !== programSlug || !state.hasSavedDraft) {
          set({ draft: { ...emptyDraft, programSlug }, currentStep: 0, hasSavedDraft: false });
        }
      },
    }),
    { name: "bughuntr-report-draft" }
  )
);
