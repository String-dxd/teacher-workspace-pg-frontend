import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { FormQuestion } from '~/data/posts-registry';

import { QuestionBuilder } from './QuestionBuilder';

function setup(questions: FormQuestion[] = [], onQuestionFocus?: (i: number) => void) {
  const dispatch = vi.fn();
  render(
    <QuestionBuilder questions={questions} dispatch={dispatch} onQuestionFocus={onQuestionFocus} />,
  );
  return dispatch;
}

describe('QuestionBuilder', () => {
  describe('empty state', () => {
    it('renders empty CTA when no questions', () => {
      setup([]);
      expect(screen.getByText('No questions added yet')).toBeInTheDocument();
    });

    it('dispatches ADD_QUESTION on CTA click', () => {
      const dispatch = setup([]);
      fireEvent.click(screen.getByText('No questions added yet').closest('button')!);
      expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_QUESTION' });
    });
  });

  describe('with questions', () => {
    const freeTextQ: FormQuestion = { id: 'q1', text: 'What allergies?', type: 'free-text' };
    const mcqQ: FormQuestion = {
      id: 'q2',
      text: 'Transport mode',
      type: 'mcq',
      options: ['Bus', 'Car', 'Walk'],
    };

    it('renders question input fields', () => {
      setup([freeTextQ]);
      expect(screen.getByDisplayValue('What allergies?')).toBeInTheDocument();
    });

    it('dispatches UPDATE_QUESTION on text change', () => {
      const dispatch = setup([freeTextQ]);
      const input = screen.getByDisplayValue('What allergies?');
      fireEvent.change(input, { target: { value: 'Updated' } });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { text: 'Updated' },
      });
    });

    it('dispatches REMOVE_QUESTION on delete click', () => {
      const dispatch = setup([freeTextQ]);
      fireEvent.click(screen.getByLabelText('Delete question'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_QUESTION', id: 'q1' });
    });

    it('renders MCQ options', () => {
      setup([mcqQ]);
      expect(screen.getByDisplayValue('Bus')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Car')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Walk')).toBeInTheDocument();
    });

    it('shows remove option button when above minimum (2)', () => {
      setup([mcqQ]); // 3 options
      const removeButtons = screen.getAllByLabelText('Remove option');
      expect(removeButtons.length).toBe(3);
    });

    it('hides remove option button at minimum (2 options)', () => {
      const twoOptQ: FormQuestion = { id: 'q1', text: 'Q', type: 'mcq', options: ['A', 'B'] };
      setup([twoOptQ]);
      expect(screen.queryByLabelText('Remove option')).not.toBeInTheDocument();
    });

    it('shows Add option button when below max (6)', () => {
      setup([mcqQ]); // 3 options
      expect(screen.getByText('Add option')).toBeInTheDocument();
    });

    it('hides Add option button at max (6 options)', () => {
      const maxOptQ: FormQuestion = {
        id: 'q1',
        text: 'Q',
        type: 'mcq',
        options: ['A', 'B', 'C', 'D', 'E', 'F'],
      };
      setup([maxOptQ]);
      expect(screen.queryByText('Add option')).not.toBeInTheDocument();
    });
  });

  describe('move buttons', () => {
    const questions: FormQuestion[] = [
      { id: 'q1', text: 'First', type: 'free-text' },
      { id: 'q2', text: 'Second', type: 'free-text' },
    ];

    it('first question has move-up disabled', () => {
      setup(questions);
      const moveUpButtons = screen.getAllByLabelText('Move up');
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('last question has move-down disabled', () => {
      setup(questions);
      const moveDownButtons = screen.getAllByLabelText('Move down');
      expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
    });

    it('dispatches MOVE_QUESTION on move-down click', () => {
      const dispatch = setup(questions);
      const moveDownButtons = screen.getAllByLabelText('Move down');
      fireEvent.click(moveDownButtons[0]); // move first question down
      expect(dispatch).toHaveBeenCalledWith({
        type: 'MOVE_QUESTION',
        id: 'q1',
        direction: 'down',
      });
    });
  });

  describe('type switching', () => {
    const freeTextQ: FormQuestion = { id: 'q1', text: 'Q', type: 'free-text' };

    it('dispatches UPDATE_QUESTION with mcq type on MCQ button click', () => {
      const dispatch = setup([freeTextQ]);
      fireEvent.click(screen.getByText('MCQ'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { type: 'mcq', options: ['', ''] },
      });
    });

    it('dispatches UPDATE_QUESTION with free-text type on Open-ended click', () => {
      const mcqQ: FormQuestion = { id: 'q1', text: 'Q', type: 'mcq', options: ['A', 'B'] };
      const dispatch = setup([mcqQ]);
      fireEvent.click(screen.getByText('Open-ended'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { type: 'free-text' },
      });
    });
  });

  describe('focus callback', () => {
    it('calls onQuestionFocus with index when question receives focus', () => {
      const onFocus = vi.fn();
      const questions: FormQuestion[] = [
        { id: 'q1', text: 'First', type: 'free-text' },
        { id: 'q2', text: 'Second', type: 'free-text' },
      ];
      setup(questions, onFocus);
      const secondInput = screen.getByDisplayValue('Second');
      fireEvent.focus(secondInput);
      expect(onFocus).toHaveBeenCalledWith(1);
    });
  });
});
