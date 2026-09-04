<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Attach demo end-of-chapter questions to any published exams.
 * Run standalone: `php artisan db:seed --class=ExamQuestionSeeder`
 */
class ExamQuestionSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        foreach (Exam::where('status', 'published')->get() as $exam) {
            if ($exam->questions()->exists()) {
                continue;
            }

            $chapter = $exam->catalogNode instanceof CatalogNode
                ? strtolower($exam->catalogNode->name)
                : '';

            $questions = str_contains($chapter, 'number')
                ? $this->mathsQuestions()
                : $this->scienceQuestions();

            foreach ($questions as $index => $question) {
                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question' => $question['question'],
                    'type' => $question['type'],
                    'options' => $question['options'] ?? null,
                    'correct_answer' => $question['correct_answer'],
                    'points' => $question['points'] ?? 1,
                    'position' => $index + 1,
                ]);
            }

            $this->command?->info("Seeded {$exam->title}: " . count($questions) . ' questions.');
        }
    }

    private function mathsQuestions(): array
    {
        return [
            ['question' => 'Which number comes just after 4?', 'type' => 'multiple_choice', 'options' => ['3', '5', '6', '10'], 'correct_answer' => '5'],
            ['question' => 'How many sides does a rectangle have?', 'type' => 'multiple_choice', 'options' => ['3', '4', '5', '6'], 'correct_answer' => '4'],
            ['question' => 'The number 10 is greater than the number 5.', 'type' => 'true_false', 'correct_answer' => 'true'],
            ['question' => '3 + 4 = ?', 'type' => 'fill_blank', 'correct_answer' => '7'],
            ['question' => 'Write the number that comes before 9.', 'type' => 'short_answer', 'correct_answer' => '8'],
        ];
    }

    
}