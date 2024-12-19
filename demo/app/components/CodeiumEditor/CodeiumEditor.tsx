'use client';

import React, { useEffect} from 'react';
import Editor, { EditorProps, Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { getDefaultValue } from '../../../../src/codeium-ai/defaultValues';
import { CodeiumLogo } from '../CodeiumLogo/CodeiumLogo';
import { Document } from '../../models';
import { deepMerge } from '../../../../src/codeium-ai/utils/merge';
import { CodeiumAI } from '../../../../src/codeium-ai';

export interface CodeiumEditorProps extends EditorProps {
  language: string;
  apiKey?: string;
  /**
   * Optional callback to detect when completions are accepted. Includes the accepted text for the completion.
   */
  onAutocomplete?: (acceptedText: string) => void;

  /**
   * Optional address of the Language Server. This should not be needed for most use cases. Defaults
   * to Codeium's language server.
   */
  languageServerAddress?: string;

  /**
   * Optional list of other documents in the workspace. This can be used to provide additional
   * context to Codeium beyond simply the current document. There is a limit of 10 medium sized
   * documents.
   */
  otherDocuments?: Document[];

  /**
   * Optional classname for the container.
   */
  containerClassName?: string;

  /**
   * Optional styles for the container.
   */
  containerStyle?: React.CSSProperties;

  /**
   * Optional multiline model threshold. Should not be needed for most use cases.
   * Numerical value between 0-1, higher = more single line, lower = more multiline,
   * 0.0 = only_multiline.
   */
  multilineModelThreshold?: number;
}

/**
 * Code editor that enables Codeium AI suggestions in the editor.
 * The layout by default is width = 100% and height = 300px. These values can be overridden by passing in a string value to the width and/or height props.
 */
export const CodeiumEditor: React.FC<CodeiumEditorProps> = ({
  languageServerAddress = 'https://web-backend.codeium.com',
  otherDocuments = [],
  containerClassName = '',
  containerStyle = {},
  ...props
}) => {
  let ai: CodeiumAI;

  const handleEditorDidMount = async (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => {
    console.log(editor, monaco, 'xxx');
    ai = new CodeiumAI(editor, monaco, props.onAutocomplete);


    // CORS pre-flight cache optimization.
    try {
      await ai.grpcClient.getCompletions({});
    } catch (e) {
      // This is expected.
    }
    ai.update();

    // Pass the editor instance to the user defined onMount prop.
    if (props.onMount) {
      props.onMount(editor, monaco);
    }
  };

  // Keep other documents up to date.
  useEffect(() => {
    console.log('update2')
    ai?.setOtherDocuments(otherDocuments);
  }, [otherDocuments]);

  let defaultLanguageProps: EditorProps = {
    defaultLanguage: props.language,
    defaultValue: getDefaultValue(props.language),
  };

  const layout = {
    width: props.width || '100%',
    // The height is set to 300px by default. Otherwise, the editor when
    // rendered with the default value will not be visible.
    // The monaco editor's default height is 100% but it requires the user to
    // define a container with an explicit height.
    height: props.height || '300px',
  };

  return (
    <div
      style={{
        ...layout,
        position: 'relative',
        ...containerStyle,
      }}
      className={containerClassName}
    >
      <a
        href={'https://codeium.com?referrer=codeium-editor'}
        target="_blank"
        rel="noreferrer noopener"
      >
        <CodeiumLogo
          width={30}
          height={30}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}
        />
      </a>
      <Editor
        {...defaultLanguageProps}
        {...props}
        width={layout.width}
        height={layout.height}
        onMount={handleEditorDidMount}
        options={deepMerge<editor.IStandaloneEditorConstructionOptions>(
          props.options,
          {
            scrollBeyondLastColumn: 0,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
            codeLens: false,
            // for resizing, but apparently might have "severe performance impact"
            // automaticLayout: true,
            minimap: {
              enabled: false,
            },
            quickSuggestions: false,
            folding: false,
            foldingHighlight: false,
            foldingImportsByDefault: false,
            links: false,
            fontSize: 14,
            wordWrap: 'on',
          },
        )}
      />
    </div>
  );
};
