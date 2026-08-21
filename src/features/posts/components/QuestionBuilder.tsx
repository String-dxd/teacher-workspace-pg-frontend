import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';

import { Button, Input, Textarea } from '~/components/ui';
import type { FormQuestion } from '~/data/posts-registry';
import type { PostFormAction } from '~/features/posts/state/actions';

export const MAX_QUESTIONS = 5;
const MIN_MCQ_OPTIONS = 2;
const MAX_MCQ_OPTIONS = 6;

interface QuestionBuilderProps {
  questions: FormQuestion[];
  dispatch: React.Dispatch<PostFormAction>;
  /** Called with the 0-based index of whichever question card just received focus. */
  onQuestionFocus?: (index: number) => void;
}

// Layout ported from the design-teacher-workspace question builder (PR #165):
// pill question input with stacked reorder arrows, muted helper textarea with
// the delete button alongside, pill-style type toggle, radio-dot MCQ options.

function QuestionBuilder({ questions, dispatch, onQuestionFocus }: QuestionBuilderProps) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground/60 italic">No questions added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          key={question.id}
          className="rounded-xl border border-border bg-card p-4"
          onFocus={() => onQuestionFocus?.(index)}
        >
          {/* Question row */}
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Question ${index + 1}`}
              value={question.text}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_QUESTION',
                  id: question.id,
                  payload: { text: e.target.value },
                })
              }
              className="h-10 flex-1 rounded-full"
            />
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() =>
                  dispatch({ type: 'MOVE_QUESTION', id: question.id, direction: 'up' })
                }
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={index === questions.length - 1}
                onClick={() =>
                  dispatch({ type: 'MOVE_QUESTION', id: question.id, direction: 'down' })
                }
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Helper text row */}
          <div className="mt-2.5 flex items-center gap-2">
            <Textarea
              placeholder="Helper text (optional)"
              value={question.description ?? ''}
              className="min-h-24 flex-1 resize-none bg-muted py-2.5 text-sm"
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_QUESTION',
                  id: question.id,
                  payload: { description: e.target.value || undefined },
                })
              }
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'REMOVE_QUESTION', id: question.id })}
              className="shrink-0 rounded p-1.5 text-destructive hover:bg-destructive/10"
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant={question.type === 'free-text' ? 'default' : 'secondary'}
              size="sm"
              onClick={() =>
                dispatch({
                  type: 'UPDATE_QUESTION',
                  id: question.id,
                  payload: { type: 'free-text' },
                })
              }
            >
              Open-ended
            </Button>
            <Button
              variant={question.type === 'mcq' ? 'default' : 'secondary'}
              size="sm"
              onClick={() =>
                dispatch({
                  type: 'UPDATE_QUESTION',
                  id: question.id,
                  payload: {
                    type: 'mcq',
                    options: question.type === 'mcq' ? question.options : ['', ''],
                  },
                })
              }
            >
              MCQ
            </Button>
          </div>

          {/* MCQ options */}
          {question.type === 'mcq' && (
            <div className="mt-3 space-y-1.5">
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 shrink-0 rounded-full border-2 border-slate-6" />
                  <Input
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question.options];
                      newOptions[optIndex] = e.target.value;
                      dispatch({
                        type: 'UPDATE_QUESTION',
                        id: question.id,
                        payload: { options: newOptions as [string, ...string[]] },
                      });
                    }}
                    className="h-8 flex-1 text-sm"
                  />
                  {question.options.length > MIN_MCQ_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = question.options.filter((_, i) => i !== optIndex);
                        dispatch({
                          type: 'UPDATE_QUESTION',
                          id: question.id,
                          payload: { options: newOptions as [string, ...string[]] },
                        });
                      }}
                      className="shrink-0 rounded p-0.5 text-slate-9 hover:text-destructive"
                      aria-label="Remove option"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {question.options.length < MAX_MCQ_OPTIONS && (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: 'UPDATE_QUESTION',
                      id: question.id,
                      payload: { options: [...question.options, ''] as [string, ...string[]] },
                    });
                  }}
                  className="ml-4 flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <Plus className="h-3 w-3" />
                  Add option
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export { QuestionBuilder };
export type { QuestionBuilderProps };
