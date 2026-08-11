export interface SendTextOptions {
  to: string;
  text: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams?: string[];
  // Only for templates whose approved HEADER is an IMAGE — Meta requires the
  // image be supplied at send-time; the "example" image shown during template
  // review/approval is not reused automatically for real sends.
  headerImageUrl?: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface SendInteractiveButtonsOptions {
  to: string;
  body: string;
  buttons: InteractiveButton[];
  footer?: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface SendInteractiveListOptions {
  to: string;
  headerText: string;
  body: string;
  buttonText: string;
  sections: ListSection[];
  footer?: string;
}

export interface SendLocationRequestOptions {
  to: string;
  body: string;
}

export interface SendImageOptions {
  to: string;
  mediaId: string;
  caption?: string;
}

export interface SendDocumentOptions {
  to: string;
  link: string;
  filename: string;
  caption?: string;
}
