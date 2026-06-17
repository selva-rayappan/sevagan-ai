export interface SendTextOptions {
  to: string;
  text: string;
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

export interface SendImageOptions {
  to: string;
  mediaId: string;
  caption?: string;
}
