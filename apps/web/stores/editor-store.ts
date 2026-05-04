import { create } from "zustand";

type EditorState = {
  selectedDrawingPageId: string | null;
  setSelectedDrawingPageId: (id: string | null) => void;
  message: string | null;
  setMessage: (message: string | null) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  selectedDrawingPageId: null,
  setSelectedDrawingPageId: (selectedDrawingPageId) => set({ selectedDrawingPageId }),
  message: null,
  setMessage: (message) => set({ message })
}));
