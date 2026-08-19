export interface SendTextOptions {
  to: string;
  text: string;
}

export interface TemplateBodyParam {
  // Must match the template's {{named_variable}} exactly, per Meta's named
  // parameter format (confirmed via the template's
  // example.body_text_named_params — this template does not use positional
  // {{1}}/{{2}} variables).
  name: string;
  value: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams?: TemplateBodyParam[];
  // Only for templates whose approved HEADER is an IMAGE — Meta requires the
  // image be supplied at send-time; the "example" image shown during template
  // review/approval is not reused automatically for real sends.
  headerImageUrl?: string;
  // Only for templates with a QUICK_REPLY BUTTONS component — one payload per
  // button, in the same order the buttons were declared at template-creation
  // time. The tapped button comes back on the inbound webhook as a `button`
  // type message carrying exactly this payload (not the button's index/id).
  quickReplyPayloads?: string[];
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
