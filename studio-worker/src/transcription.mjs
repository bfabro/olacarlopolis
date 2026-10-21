export class DisabledTranscriptionProvider {
  get name() { return "disabled"; }
  async transcribe() { return { available: false, provider: this.name, segments: [], reason: "Nenhum provedor de transcricao foi configurado." }; }
}

export function createTranscriptionProvider() {
  return new DisabledTranscriptionProvider();
}
