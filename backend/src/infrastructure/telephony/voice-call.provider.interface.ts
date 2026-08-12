export const VOICE_CALL_PROVIDER = Symbol('VOICE_CALL_PROVIDER');

export interface PlaceCallOptions {
  to: string;
  // XML app URL the provider fetches once the call connects, telling it what
  // to play/collect. Callers bake any context (language, job) into its query
  // string rather than this interface knowing about business specifics.
  answerUrl: string;
}

/**
 * Abstraction over the outbound voice-calling provider. Swap implementations
 * (Plivo → Exotel → etc.) by providing a different class for the
 * VOICE_CALL_PROVIDER token — no business logic changes. Mirrors WhatsAppProvider.
 */
export interface VoiceCallProvider {
  placeCall(options: PlaceCallOptions): Promise<void>;
}
