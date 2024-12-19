import { createConnectTransport } from '@connectrpc/connect-web';
import { Status } from './Status';
import { LanguageServerService } from './api/proto/exa/language_server_pb/language_server_connect';
import { createPromiseClient, PromiseClient } from '@connectrpc/connect';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { Document } from './api/proto/exa/language_server_pb/language_server_pb';

export class CodeiumAI {
  languageServerAddress = 'https://web-backend.codeium.com';
  apiKey?: string;
  multilineModelThreshold?: number
  inlineCompletionsProvider: InlineCompletionProvider;
  grpcClient: PromiseClient<typeof LanguageServerService>;
  private _acceptedCompletionCount = -1;
  onAutocomplete?: (acceptedText: string) => void;
  private monaco: typeof monacoEditor;
  private editor: editor.IStandaloneCodeEditor;
  providerDisposable?: monacoEditor.IDisposable;
  completionDisposable?: monacoEditor.IDisposable;
  constructor(editor: editor.IStandaloneCodeEditor, monaco: typeof monacoEditor, onAutocomplete?: (acceptedText: string) => void) {
    let completionCount = 0;
    let codeiumStatus = Status.INACTIVE;
    let codeiumStatusMessage = '';
    const transport = createConnectTransport({
      baseUrl: this.languageServerAddress,
      useBinaryFormat: true,
    });
    this.onAutocomplete = onAutocomplete;
    this.editor = editor;
    this.monaco = monaco;

    const grpcClient = createPromiseClient(LanguageServerService, transport);
    this.grpcClient = grpcClient;

    this.inlineCompletionsProvider = new InlineCompletionProvider(
      grpcClient,
      (count: number) => completionCount = count,
      (status: Status) => codeiumStatus = status,
      (message: string) => codeiumStatusMessage = message,
      this.apiKey,
      this.multilineModelThreshold,
    );
  }
  update() {
    if (this.providerDisposable) {
      this.providerDisposable.dispose();
      this.providerDisposable = undefined;
    }
    if (this.completionDisposable) {
      this.completionDisposable.dispose();
      this.completionDisposable = undefined;
    }
    this.providerDisposable =
      this.monaco.languages.registerInlineCompletionsProvider(
        { pattern: '**' },
        this.inlineCompletionsProvider,
      );
    this.completionDisposable = this.monaco.editor.registerCommand(
      'codeium.acceptCompletion',
      (_: unknown, completionId: string, insertText: string) => {
        try {
          if (this.onAutocomplete) {
            this.onAutocomplete(insertText);
          }
          this.setAcceptedCompletionCount(this.acceptedCompletionCount + 1);
          this.inlineCompletionsProvider.acceptedLastCompletion(
            completionId,
          );
        } catch (err) {
          console.log('Err');
        }
      },
    );
  }
  get acceptedCompletionCount() {
    return this._acceptedCompletionCount;
  }
  setAcceptedCompletionCount(count: number) {
    this._acceptedCompletionCount = count;
    this.update();
  }
  setOtherDocuments(documents: Document[]) {
    this.inlineCompletionsProvider?.updateOtherDocuments(documents);
  }
}