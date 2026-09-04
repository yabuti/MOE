<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Database\Seeder;

/**
 * Create a published end-of-chapter exam (20 questions each, with correct
 * answers) for every English unit in Grade 5 and Grade 7.
 * Run standalone: `php artisan db:seed --class=EnglishExamSeeder`
 */
class EnglishExamSeeder extends Seeder
{
    public function run(): void
    {
        $bookType = CatalogNodeType::where('slug', 'book')->first();
        if (! $bookType) {
            $this->command?->error('Book node type not found.');

            return;
        }

        $banks = $this->questionBanks();

        foreach (['Grade 5', 'Grade 7'] as $gradeName) {
            $grade = CatalogNode::where('slug', strtolower(str_replace(' ', '-', $gradeName)))
                ->where('catalog_node_type_id', CatalogNodeType::where('slug', 'grade')->first()->id)
                ->first();

            $book = $grade?->children()
                ->where('catalog_node_type_id', $bookType->id)
                ->where('name', 'English')
                ->first();

            if (! $book) {
                $this->command?->warn("English book not found for {$gradeName}.");

                continue;
            }

            foreach ($book->children()->orderBy('sort_order')->get() as $chapter) {
                if (! isset($banks[$chapter->name])) {
                    $this->command?->warn("No question bank for chapter: {$chapter->name}");

                    continue;
                }

                $exam = Exam::firstOrCreate(
                    ['catalog_node_id' => $chapter->id],
                    [
                        'title' => $chapter->name . ' — Exam',
                        'description' => 'End of chapter exam for "' . $chapter->name . '" in ' . $book->name . '.',
                        'pass_percentage' => 60,
                        'duration_minutes' => 30,
                        'max_attempts' => 3,
                        'status' => 'published',
                    ]
                );

                if ($exam->questions()->exists()) {
                    $this->command?->info("Skipped {$exam->title} (already has questions).");

                    continue;
                }

                foreach ($banks[$chapter->name] as $index => $q) {
                    ExamQuestion::create([
                        'exam_id' => $exam->id,
                        'question' => $q['question'],
                        'type' => $q['type'],
                        'options' => $q['options'] ?? null,
                        'correct_answer' => $q['correct_answer'],
                        'points' => $q['points'] ?? 1,
                        'position' => $index + 1,
                    ]);
                }

                $this->command?->info("Seeded {$exam->title}: " . count($banks[$chapter->name]) . ' questions.');
            }
        }
    }

    private function mc(string $question, array $options, string $correct): array
    {
        return [
            'question' => $question,
            'type' => 'multiple_choice',
            'options' => $options,
            'correct_answer' => $correct,
        ];
    }

    private function tf(string $question, bool $correct): array
    {
        return [
            'question' => $question,
            'type' => 'true_false',
            'correct_answer' => $correct ? 'True' : 'False',
        ];
    }

    private function questionBanks(): array
    {
        return [
            'Unit One: Holidays' => [
                $this->mc('What is a holiday?', ['A day of rest and celebration', 'A day of working extra', 'A day of exams', 'A kind of food'], 'A day of rest and celebration'),
                $this->mc('Which of these is a national holiday?', ['New Year', 'A normal Monday', 'An ordinary weekend', 'A school break'], 'New Year'),
                $this->mc('How do people usually celebrate a holiday?', ['By working all day', 'By having fun with family and friends', 'By sleeping all day', 'By studying only'], 'By having fun with family and friends'),
                $this->mc('What might families do together on a holiday?', ['Share a meal and talk', 'Ignore each other', 'Stay inside alone', 'Avoid speaking'], 'Share a meal and talk'),
                $this->mc('The word "holiday" comes from the idea of a "holy day".', ['True', 'False', '', ''], 'True'),
                $this->mc('A holiday is a time for people to relax.', ['True', 'False', '', ''], 'True'),
                $this->mc('People celebrate holidays in exactly the same way everywhere in the world.', ['True', 'False', '', ''], 'False'),
                $this->tf('Holidays give people a break from their daily work.', true),
                $this->mc('Which activity is common during holidays?', ['Visiting relatives', 'Plowing fields', 'Taking tests', 'Attending night school'], 'Visiting relatives'),
                $this->mc('Holidays are usually marked on a special ______.', ['calendar', 'forest', 'river', 'market'], 'calendar'),
                $this->mc('During holidays children often ______.', ['play and rest', 'never leave home', 'skip meals', 'avoid friends'], 'play and rest'),
                $this->tf('People prepare special food for many holidays.', true),
                $this->mc('What is important about holidays for families?', ['Spending time together', 'Working harder', 'Avoiding each other', 'Forgetting traditions'], 'Spending time together'),
                $this->mc('Holidays help people to ______.', ['recharge and be happy', 'get tired', 'waste time', 'be alone'], 'recharge and be happy'),
                $this->tf('Holidays are only for one country in the world.', false),
                $this->mc('On holidays, people often wear ______ clothes.', ['special or new', 'ragged', 'dirty', 'work'], 'special or new'),
                $this->mc('A public holiday is one that is ______.', ['celebrated by the whole country', 'kept secret', 'only for students', 'only for farmers'], 'celebrated by the whole country'),
                $this->mc('The main purpose of a holiday celebration is to ______.', ['enjoy and remember', 'argue', 'forget', 'run away'], 'enjoy and remember'),
                $this->tf('Holidays help to pass on traditions from parents to children.', true),
                $this->mc('After a holiday, people usually feel ______.', ['refreshed', 'angry', 'bored', 'sick'], 'refreshed'),
            ],

            'Unit Two: Dry Season' => [
                $this->mc('What is the dry season?', ['The season with little or no rain', 'The season with heavy rain', 'The coldest season', 'The season of flowers only'], 'The season with little or no rain'),
                $this->mc('During the dry season, rivers and wells often ______.', ['dry up', 'overflow', 'freeze', 'turn salty'], 'dry up'),
                $this->mc('Which problem is common in the dry season?', ['Shortage of water', 'Too much rain', 'Flooding', 'Too much snow'], 'Shortage of water'),
                $this->mc('Animals may suffer in the dry season because of ______.', ['lack of water and grass', 'too much food', 'too much rain', 'cold weather'], 'lack of water and grass'),
                $this->tf('The dry season has very little rainfall.', true),
                $this->mc('What can people do to save water in the dry season?', ['Use water carefully', 'Waste water', 'Avoid water entirely', 'Boil all water'], 'Use water carefully'),
                $this->tf('The dry season is the same as the rainy season.', false),
                $this->mc('In the dry season, farmers often worry about their ______.', ['crops', 'books', 'bicycles', 'clothes'], 'crops'),
                $this->mc('When there is not enough rain we say there is a ______.', ['drought', 'flood', 'storm', 'breeze'], 'drought'),
                $this->mc('People can store ______ to help during the dry season.', ['water', 'garbage', 'sand', 'smoke'], 'water'),
                $this->tf('Dry seasons can make soil dry and hard.', true),
                $this->mc('To fight the dry season, people may build ______.', ['water tanks', 'sand piles', 'empty rooms', 'high walls'], 'water tanks'),
                $this->mc('Plants need ______ to survive the dry season.', ['water', 'fire', 'smoke', 'dust'], 'water'),
                $this->tf('The dry season can cause problems for both people and animals.', true),
                $this->mc('Keeping water clean is important especially in the ______.', ['dry season', 'exam season', 'market', 'farmyard'], 'dry season'),
                $this->mc('Vaccinating animals before the dry season helps them to ______.', ['stay healthy', 'get sick', 'run away', 'sleep'], 'stay healthy'),
                $this->tf('The dry season has no effect on crops.', false),
                $this->mc('During the dry season the sun is often ______ and hot.', ['strong', 'weak', 'hidden', 'cloudy'], 'strong'),
                $this->mc('People should plan ahead to manage ______ during the dry season.', ['water supply', 'holiday fun', 'new clothes', 'sweets'], 'water supply'),
                $this->tf('Saving and reusing water is a good habit during the dry season.', true),
            ],

            'Unit Three: Accidents' => [
                $this->mc('What is an accident?', ['An unexpected harmful event', 'A planned event', 'A celebration', 'A kind of food'], 'An unexpected harmful event'),
                $this->mc('Which of these can cause accidents?', ['Carelessness', 'Careful driving', 'Following rules', 'Being cautious'], 'Carelessness'),
                $this->mc('One way to prevent accidents is to ______.', ['follow safety rules', 'ignore warnings', 'run in traffic', 'play with fire'], 'follow safety rules'),
                $this->tf('Accidents can happen in the home, on the road, and at school.', true),
                $this->mc('What should you do after an accident?', ['Call for help', 'Run away', 'Hide the truth', 'Ignore the injured'], 'Call for help'),
                $this->mc('Crossing the road when the light is green is an example of ______.', ['safety', 'carelessness', 'danger', 'neglect'], 'safety'),
                $this->tf('Most accidents cannot be prevented.', false),
                $this->mc('To treat a small cut you should ______.', ['clean it and cover it', 'ignore it', 'rub dirt in it', 'leave it open'], 'clean it and cover it'),
                $this->mc('First aid is the help given to an injured person ______.', ['before medical help arrives', 'after a long wait', 'only in hospital', 'by strangers only'], 'before medical help arrives'),
                $this->tf('Speeding is a common cause of road accidents.', true),
                $this->mc('Wearing a seat belt helps to ______.', ['keep you safe in a crash', 'make the car slow', 'make driving fun', 'increase risk'], 'keep you safe in a crash'),
                $this->mc('Children should be careful with ______ at home.', ['sharp objects', 'soft toys', 'books', 'pictures'], 'sharp objects'),
                $this->tf('Running across the road without looking is safe.', false),
                $this->mc('If there is a fire, you should ______.', ['leave the building calmly', 'hide under the bed', 'run into the flames', 'carry water alone'], 'leave the building calmly'),
                $this->mc('An emergency telephone number is used to ______.', ['call for help fast', 'order food', 'talk with friends', 'play games'], 'call for help fast'),
                $this->tf('Being careless at home can cause accidents.', true),
                $this->mc('To prevent accidents at school, students should ______.', ['follow teacher instructions', 'push each other', 'run indoors', 'climb windows'], 'follow teacher instructions'),
                $this->mc('A person who gives first aid should stay ______.', ['calm', 'angry', 'tired', 'scared'], 'calm'),
                $this->tf('Keeping floors dry helps prevent slips and falls.', true),
                $this->mc('The best way to deal with accidents is to ______.', ['prevent them', 'ignore them', 'cause them', 'wait for them'], 'prevent them'),
            ],

            'Unit Four: Minerals' => [
                $this->mc('What are minerals?', ['Natural substances found in the earth', 'Kinds of food', 'Types of plants', 'Kinds of cloth'], 'Natural substances found in the earth'),
                $this->mc('Which of these is an example of a mineral?', ['Gold', 'Banana', 'Water bottle', 'Paper'], 'Gold'),
                $this->mc('Mining is the process of ______.', ['removing minerals from the ground', 'planting trees', 'cooking food', 'building houses'], 'removing minerals from the ground'),
                $this->tf('Minerals are found in the soil and rocks of the earth.', true),
                $this->mc('Gold, silver, and copper are all ______.', ['metals', 'fruits', 'animals', 'liquids'], 'metals'),
                $this->mc('Salt is a mineral that we use for ______.', ['food and preservation', 'writing only', 'clothing', 'building tall towers'], 'food and preservation'),
                $this->tf('Minerals are important for a country\'s economy.', true),
                $this->mc('Ethiopia is known for its deposits of ______.', ['gold and other minerals', 'only rice', 'plastic', 'cotton candy'], 'gold and other minerals'),
                $this->mc('Minerals such as gold are used to make ______.', ['jewellery', 'leaves', 'clouds', 'speech'], 'jewellery'),
                $this->tf('Mining must be done safely so that miners stay healthy.', true),
                $this->mc('The rocks that contain useful minerals are called ______.', ['ores', 'fruits', 'rivers', 'winds'], 'ores'),
                $this->mc('Minerals are a ______ resource that cannot be replaced quickly.', ['non-renewable', 'renewable', 'growing', 'liquid'], 'non-renewable'),
                $this->tf('All minerals are as common as sand.', false),
                $this->mc('Mining gives jobs to many ______.', ['workers', 'birds', 'trees', 'clouds'], 'workers'),
                $this->mc('To protect miners, they should use proper ______.', ['safety equipment', 'sleep', 'games', 'fast cars'], 'safety equipment'),
                $this->tf('Careless mining can damage the environment.', true),
                $this->mc('Places where minerals are dug out are called ______.', ['mines', 'orchards', 'libraries', 'markets'], 'mines'),
                $this->mc('Minerals are used in making ______ for buildings.', ['metals like iron', 'clouds', 'songs', 'shadows'], 'metals like iron'),
                $this->tf('Minerals are found only in the sea.', false),
                $this->mc('People should use mineral resources ______.', ['carefully', 'wastefully', 'quickly', 'carelessly'], 'carefully'),
            ],

            'Unit Five: Beekeeping' => [
                $this->mc('What is beekeeping?', ['Raising bees to produce honey', 'Hunting wild animals', 'Planting flowers', 'Making paper'], 'Raising bees to produce honey'),
                $this->mc('What do bees produce?', ['Honey', 'Salt', 'Milk', 'Copper'], 'Honey'),
                $this->mc('Bees live in a group called a ______.', ['colony', 'herd', 'school', 'flock'], 'colony'),
                $this->tf('Bees help flowers by carrying pollen from one flower to another.', true),
                $this->mc('The person who keeps bees is called a ______.', ['beekeeper', 'fisherman', 'gardener', 'hunter'], 'beekeeper'),
                $this->mc('Beekeepers wear protective clothing to avoid ______.', ['bee stings', 'rain', 'sunlight', 'noise'], 'bee stings'),
                $this->tf('Honey is a sweet and healthy food.', true),
                $this->mc('Bees live in a box called a ______.', ['hive', 'cage', 'nest', 'hole'], 'hive'),
                $this->mc('Why are bees important for crops?', ['They pollinate flowers', 'They eat the leaves', 'They cut the stems', 'They steal the honey'], 'They pollinate flowers'),
                $this->tf('Beekeeping can be a good source of income.', true),
                $this->mc('Honey is used to make ______.', ['syrup and medicines', 'only stones', 'wooden chairs', 'plastic bags'], 'syrup and medicines'),
                $this->mc('Where should a beehive be placed?', ['Near flowers and away from people', 'Inside a closed room', 'In the middle of a road', 'Underground'], 'Near flowers and away from people'),
                $this->tf('Bees only make honey; they do not help plants.', false),
                $this->mc('The sweet liquid collected by bees from flowers is called ______.', ['nectar', 'milk', 'water', 'juice of the stem'], 'nectar'),
                $this->mc('A healthy beehive helps to increase ______.', ['crop production', 'flooding', 'storm damage', 'soil erosion'], 'crop production'),
                $this->tf('Smoke is sometimes used to calm bees when collecting honey.', true),
                $this->mc('Beekeeping does not require much ______.', ['space', 'care', 'water for bees', 'danger'], 'space'),
                $this->mc('Honeycomb is the structure that bees build to store ______.', ['honey and eggs', 'sand and dust', 'leaves and sticks', 'water only'], 'honey and eggs'),
                $this->tf('Protecting bees helps to protect the environment.', true),
                $this->mc('Ethiopia is known in Africa for its ______.', ['beekeeping', 'deserts', 'ice', 'oil wells'], 'beekeeping'),
            ],

            'Unit Six: Water Pollution' => [
                $this->mc('What is water pollution?', ['Making water dirty and unsafe', 'Adding clean water to rivers', 'Boiling water', 'Freezing water'], 'Making water dirty and unsafe'),
                $this->mc('Which of these causes water pollution?', ['Throwing waste into rivers', 'Raining often', 'Planting trees', 'Saving water'], 'Throwing waste into rivers'),
                $this->tf('Clean water is important for good health.', true),
                $this->mc('Polluted water can cause ______.', ['sickness', 'good health', 'strong teeth', 'healthy crops'], 'sickness'),
                $this->mc('Factories that pour chemicals into rivers cause ______.', ['water pollution', 'fresh air', 'healthy fish', 'clean water'], 'water pollution'),
                $this->tf('We should keep rivers and lakes clean.', true),
                $this->mc('One way to reduce water pollution is to ______.', ['not throw rubbish into water', 'pour oil in rivers', 'waste water', 'leave garbage on the banks'], 'not throw rubbish into water'),
                $this->mc('Boiling water before drinking helps to ______.', ['make it safe', 'pollute it', 'add chemicals', 'make it salty'], 'make it safe'),
                $this->tf('Dirty water can spread diseases.', true),
                $this->mc('Which creature is often harmed by polluted water?', ['Fish', 'Clouds', 'Mountains', 'Wind'], 'Fish'),
                $this->mc('Farmers should not use too many ______ that flow into water.', ['chemicals and fertilizers', 'seeds', 'trees', 'stones'], 'chemicals and fertilizers'),
                $this->tf('Throwing plastic into rivers helps the environment.', false),
                $this->mc('Clean rivers provide ______ to people and animals.', ['safe drinking water', 'only sand', 'garbage', 'poison'], 'safe drinking water'),
                $this->mc('Everyone should work together to ______ water.', ['protect', 'waste', 'pollute', 'ignore'], 'protect'),
                $this->tf('Water pollution affects only fish and not people.', false),
                $this->mc('One sign of polluted water is that it ______.', ['smells bad', 'is crystal clear', 'tastes very sweet', 'is always cold'], 'smells bad'),
                $this->mc('To stop pollution, waste should be ______ properly.', ['disposed of', 'thrown in rivers', 'left on roads', 'buried in water'], 'disposed of'),
                $this->tf('Using clean water to wash vegetables makes them safer to eat.', true),
                $this->mc('Protecting water sources is the responsibility of ______.', ['everyone', 'only fishermen', 'only children', 'nobody'], 'everyone'),
                $this->tf('Water pollution can be prevented by taking simple care.', true),
            ],

            'Unit Seven: Good Citizens' => [
                $this->mc('Who is a good citizen?', ['A person who follows the law and helps others', 'A person who breaks rules', 'A person who steals', 'A person who ignores people'], 'A person who follows the law and helps others'),
                $this->mc('A good citizen respects other people\'s ______.', ['rights', 'things without asking', 'privacy', 'work only'], 'rights'),
                $this->tf('Good citizens keep their surroundings clean.', true),
                $this->mc('Voting in elections is the duty of a ______.', ['citizen', 'child only', 'tourist', 'visitor'], 'citizen'),
                $this->mc('Obeying traffic rules shows that you are a ______ citizen.', ['good', 'bad', 'lazy', 'selfish'], 'good'),
                $this->tf('A good citizen destroys public property.', false),
                $this->mc('Helping the poor is an example of being a ______ citizen.', ['kind and good', 'selfish', 'cruel', 'lazy'], 'kind and good'),
                $this->mc('Paying taxes helps the government to ______.', ['build services for people', 'waste money', 'ignore people', 'stop working'], 'build services for people'),
                $this->tf('Respecting everyone equally is a sign of a good citizen.', true),
                $this->mc('A good citizen protects public places like ______.', ['parks', 'private gardens only', 'their own room only', 'no place'], 'parks'),
                $this->mc('Keeping the community clean is a ______ of a citizen.', ['responsibility', 'choice only', 'game', 'joke'], 'responsibility'),
                $this->tf('A good citizen does not help the community.', false),
                $this->mc('Which behaviour shows good citizenship?', ['Helping an old person cross the road', 'Littering the street', 'Breaking a window', 'Refusing to share'], 'Helping an old person cross the road'),
                $this->mc('Good citizens protect ______ resources.', ['public and natural', 'only private', 'other people\'s', 'nobody\'s'], 'public and natural'),
                $this->tf('Being honest makes you a good citizen.', true),
                $this->mc('Cooperation between citizens helps to ______.', ['build a strong community', 'cause problems', 'start fights', 'waste time'], 'build a strong community'),
                $this->mc('Good citizens should also take care of ______.', ['the environment', 'nothing', 'only themselves', 'other countries alone'], 'the environment'),
                $this->tf('Good citizens help only their own family members.', false),
                $this->mc('Citizens who follow rules help to keep ______ in society.', ['peace', 'disorder', 'confusion', 'fear'], 'peace'),
                $this->tf('Educated and caring citizens make a country stronger.', true),
            ],

            'Unit Eight: Healthcare Facilities' => [
                $this->mc('What are healthcare facilities?', ['Places where people get medical care', 'Places where people sleep only', 'Markets for food', 'Schools for the day'], 'Places where people get medical care'),
                $this->mc('Which of these is a healthcare facility?', ['A hospital', 'A bakery', 'A farm', 'A theater'], 'A hospital'),
                $this->tf('Clinics help to treat sick people.', true),
                $this->mc('A health post is usually found in ______.', ['rural villages', 'only big cities', 'the middle of a lake', 'outer space'], 'rural villages'),
                $this->mc('Doctors and nurses work in ______.', ['hospitals', 'markets', 'fields', 'garages'], 'hospitals'),
                $this->tf('It is important to wash your hands to stay healthy.', true),
                $this->mc('Vaccination protects people from ______.', ['diseases', 'good health', 'happiness', 'friendship'], 'diseases'),
                $this->mc('The person who treats sick people is a ______.', ['doctor', 'farmer', 'driver', 'tailor'], 'doctor'),
                $this->tf('Clean water and sanitation prevent many diseases.', true),
                $this->mc('A health centre provides ______ for the community.', ['basic care', 'only toys', 'food recipes', 'clothing'], 'basic care'),
                $this->mc('For a serious injury you should go to a ______.', ['hospital', 'market', 'school', 'park'], 'hospital'),
                $this->tf('Checking your health regularly is a good habit.', true),
                $this->mc('Antenatal care is for ______.', ['pregnant mothers', 'only children', 'only farmers', 'travellers'], 'pregnant mothers'),
                $this->mc('To stay healthy we should eat ______ food.', ['balanced', 'only sweet', 'only fried', 'only cold'], 'balanced'),
                $this->tf('Healthcare facilities are not important for a community.', false),
                $this->mc('Clean water near health facilities helps to ______.', ['prevent infection', 'spread disease', 'cause fever', 'attract illness'], 'prevent infection'),
                $this->mc('Health facilities give advice about ______.', ['hygiene and prevention', 'only games', 'farming tricks', 'travelling routes'], 'hygiene and prevention'),
                $this->tf('Always ask a professional for medical advice.', true),
                $this->mc('Villages need health posts so that people can get ______.', ['quick care nearby', 'far away care', 'no care', 'only travel'], 'quick care nearby'),
                $this->tf('Prevention is better than cure.', true),
            ],

            'Unit Nine: Living with Differences' => [
                $this->mc('What does "living with differences" mean?', ['Respecting people who are different from you', 'Avoiding all people', 'Fighting with others', 'Copying everyone'], 'Respecting people who are different from you'),
                $this->mc('People can be different in their language and ______.', ['culture', 'hands', 'ages of the moon', 'shoes only'], 'culture'),
                $this->tf('It is good to respect people of all cultures.', true),
                $this->mc('When people respect differences, there is more ______.', ['peace', 'fighting', 'anger', 'confusion'], 'peace'),
                $this->mc('We should treat others the way we want to be ______.', ['treated', 'ignored', 'scolded', 'forgotten'], 'treated'),
                $this->tf('Differences between people should be respected.', true),
                $this->mc('Learning about other cultures helps us to ______.', ['understand each other', 'stay apart', 'argue more', 'avoid friends'], 'understand each other'),
                $this->mc('A person who laughs at others for being different is being ______.', ['rude', 'kind', 'helpful', 'fair'], 'rude'),
                $this->tf('Everyone deserves respect regardless of their background.', true),
                $this->mc('Working together with people who are different can ______.', ['bring new ideas', 'stop progress', 'cause failure', 'waste time'], 'bring new ideas'),
                $this->mc('A society that accepts differences is ______.', ['stronger', 'weaker', 'more dangerous', 'confused'], 'stronger'),
                $this->tf('Discrimination against others is unacceptable.', true),
                $this->mc('To live with differences, people should ______.', ['listen and be tolerant', 'only talk about themselves', 'ignore others', 'force others to change'], 'listen and be tolerant'),
                $this->mc('Sharing customs with others helps to build ______.', ['friendship', 'hatred', 'fear', 'loneliness'], 'friendship'),
                $this->tf('We should only befriend people exactly like us.', false),
                $this->mc('Respecting differences helps to prevent ______.', ['conflict', 'happiness', 'cooperation', 'progress'], 'conflict'),
                $this->mc('Teaching tolerance begins at ______.', ['home and school', 'work only', 'no place', 'the market'], 'home and school'),
                $this->tf('Understanding each other brings people closer.', true),
                $this->mc('Celebrating different festivals together shows ______.', ['acceptance', 'division', 'anger', 'jealousy'], 'acceptance'),
                $this->tf('Differences can be a source of strength if respected.', true),
            ],

            'Unit Ten: Assistive Technology' => [
                $this->mc('What is assistive technology?', ['Tools that help people with disabilities', 'Games for fun only', 'Books for reading only', 'Toys for babies'], 'Tools that help people with disabilities'),
                $this->mc('A wheelchair is an example of assistive technology for people who ______.', ['cannot walk easily', 'want to run fast', 'need to swim', 'like to jump'], 'cannot walk easily'),
                $this->tf('Assistive technology helps people to live more independently.', true),
                $this->mc('A hearing aid helps people who have ______.', ['hearing problems', 'vision problems', 'taste problems', 'speech only'], 'hearing problems'),
                $this->mc('Glasses help people who have difficulty ______.', ['seeing', 'hearing', 'walking', 'talking'], 'seeing'),
                $this->tf('Assistive technology makes life harder for people.', false),
                $this->mc('Text-to-speech software helps people with ______.', ['reading difficulties', 'fast running', 'heavy lifting', 'dancing'], 'reading difficulties'),
                $this->mc('Braille is a system used by people who are ______.', ['blind', 'deaf', 'running', 'dancing'], 'blind'),
                $this->tf('Everyone should respect and help people who use assistive devices.', true),
                $this->mc('Assistive technology gives people with disabilities more ______.', ['opportunities', 'trouble', 'fear', 'loneliness'], 'opportunities'),
                $this->mc('Walkers and crutches help people to ______.', ['move around', 'read better', 'hear clearly', 'see far'], 'move around'),
                $this->tf('Assistive devices should be available to those who need them.', true),
                $this->mc('New technology now includes special _______ for computers.', ['accessibility tools', 'only games', 'heavy boxes', 'paper files'], 'accessibility tools'),
                $this->mc('The goal of assistive technology is to ______.', ['support independence', 'increase disability', 'remove help', 'cause problems'], 'support independence'),
                $this->tf('Assistive technology cannot help people learn.', false),
                $this->mc('People with disabilities should be ______.', ['supported and included', 'ignored', 'avoided', 'laughed at'], 'supported and included'),
                $this->mc('A wheelchair helps a person to ______.', ['move from place to place', 'see better', 'hear better', 'speak louder'], 'move from place to place'),
                $this->tf('Inclusive designs help everyone in society.', true),
                $this->mc('Assistive technology helps students with disabilities to ______.', ['learn at school', 'avoid school', 'stay home always', 'stop reading'], 'learn at school'),
                $this->tf('Technology should be used to include everyone equally.', true),
            ],

            'Unit One: Life in the Countryside' => [
                $this->mc('What is life in the countryside usually like?', ['Quiet and close to nature', 'Very noisy with factories', 'Full of tall buildings', 'Always crowded'], 'Quiet and close to nature'),
                $this->mc('Many people in the countryside work as ______.', ['farmers', 'sky divers', 'train drivers', 'lifeguards'], 'farmers'),
                $this->tf('In the countryside there is usually fresh air.', true),
                $this->mc('The countryside has more ______ than the city.', ['trees and fields', 'skyscrapers', 'passenger trains', 'undergrounds'], 'trees and fields'),
                $this->mc('People in the countryside often grow their own ______.', ['food', 'plastic', 'screens', 'metal'], 'food'),
                $this->tf('Life in the countryside is exactly the same as city life.', false),
                $this->mc('Which activity is common in the countryside?', ['Plowing and harvesting', 'Flying planes', 'Steering ships', 'Driving subways'], 'Plowing and harvesting'),
                $this->mc('Countryside communities are usually ______.', ['close and cooperative', 'strange to each other', 'in constant conflict', 'isolated always'], 'close and cooperative'),
                $this->tf('Living close to nature is a good thing about rural life.', true),
                $this->mc('Some challenges of rural life include ______.', ['distance from services', 'too many shops', 'heavy traffic', 'too many skyscrapers'], 'distance from services'),
                $this->mc('In the countryside, animals are often ______ for work.', ['kept', 'ignored', 'forgotten', 'hidden'], 'kept'),
                $this->tf('Rural people depend a lot on the weather and seasons.', true),
                $this->mc('The countryside provides ______ for the city people.', ['food and resources', 'only noise', 'tall towers', 'heavy smog'], 'food and resources'),
                $this->mc('People travel long distances in the countryside because ______.', ['of far-apart villages', 'services are next door', 'the roads are short', 'there is no need to travel'], 'of far-apart villages'),
                $this->tf('Clean water is always easy to get in the countryside.', false),
                $this->mc('Children in the countryside often help their parents with ______.', ['farm work', 'flying planes', 'bank deals', 'office tasks'], 'farm work'),
                $this->tf('The countryside is rich in natural beauty.', true),
                $this->mc('Improving roads can help ______ people in the countryside.', ['connect', 'separate', 'confuse', 'ignore'], 'connect'),
                $this->tf('Villagers can teach us many things about hard work.', true),
                $this->mc('The main occupation in the countryside is ______.', ['farming', 'banking', 'tourism office work', 'computer repair'], 'farming'),
            ],

            'Unit Two: History of Calendar' => [
                $this->mc('What is a calendar used for?', ['Measuring and organizing days and months', 'Growing crops', 'Building houses', 'Cooking food'], 'Measuring and organizing days and months'),
                $this->mc('A year is made up of ______.', ['12 months', '5 months', '20 months', '2 months'], '12 months'),
                $this->tf('Calendars help us to know about days and festivals.', true),
                $this->mc('The Ethiopian calendar has ______ months of 30 days plus a short month.', ['12', '10', '11', '13'], '12'),
                $this->mc('There are about ______ days in a year.', ['365', '100', '500', '200'], '365'),
                $this->tf('The calendar was invented by humans to organize time.', true),
                $this->mc('A leap year has ______ day(s) added to the calendar.', ['one', 'ten', 'seven', 'zero'], 'one'),
                $this->mc('Weeks are made up of ______.', ['7 days', '15 days', '3 days', '30 days'], '7 days'),
                $this->tf('The Ethiopian calendar is different from the Gregorian calendar.', true),
                $this->mc('Ancient people used the ______ to count days.', ['moon and the sun', 'just the wind', 'just the rain', 'just the soil'], 'moon and the sun'),
                $this->mc('The calendar helps people to plan their ______.', ['activities', 'dreams only', 'names', 'thoughts only'], 'activities'),
                $this->tf('The year begins at the same time on all calendars.', false),
                $this->mc('The Ethiopian New Year is called ______.', ['Enkutatash', 'Timkat', 'Meskel', 'Genna'], 'Enkutatash'),
                $this->mc('The four main periods in a year based on weather are called ______.', ['seasons', 'hours', 'minutes', 'seconds'], 'seasons'),
                $this->tf('Knowing the date helps people to celebrate festivals on time.', true),
                $this->mc('The calendar is divided into smaller parts called ______.', ['months and days', 'only years', 'only weeks', 'only hours'], 'months and days'),
                $this->mc('The 13th month in the Ethiopian calendar has ______ days.', ['5 or 6', '30', '15', '20'], '5 or 6'),
                $this->tf('The calendar does not help in planning farming.', false),
                $this->mc('People use the calendar to know when to ______.', ['plant and harvest crops', 'forget their work', 'avoid the sun', 'waste time'], 'plant and harvest crops'),
                $this->tf('The calendar is an important invention of human beings.', true),
            ],

            'Unit Three: Road Safety' => [
                $this->mc('Why should we cross the road carefully?', ['To stay safe from traffic', 'To walk faster', 'To run more', 'To stop cars for fun'], 'To stay safe from traffic'),
                $this->mc('A zebra crossing is a place where people ______.', ['cross the road safely', 'park cars', 'play games', 'buy food'], 'cross the road safely'),
                $this->tf('Pedestrians should use the footpath.', true),
                $this->mc('Before crossing the road, you should ______.', ['look left and right', 'close your eyes', 'run quickly', 'look down only'], 'look left and right'),
                $this->mc('A red traffic light means ______.', ['stop', 'go fast', 'turn around', 'honk loudly'], 'stop'),
                $this->tf('A green traffic light means you can cross safely when clear.', true),
                $this->mc('Wearing bright clothes at night helps ______ to see you.', ['drivers', 'the moon', 'the trees', 'nobody'], 'drivers'),
                $this->mc('Cyclists should wear a ______ for safety.', ['helmet', 'soft cap', 'hat only for style', 'hood'], 'helmet'),
                $this->tf('Running across the road is a safe habit.', false),
                $this->mc('The rule "look before you cross" helps to prevent ______.', ['accidents', 'birthdays', 'shopping', 'picnics'], 'accidents'),
                $this->mc('Pedestrians should walk on the ______.', ['side of the road facing traffic', 'middle of the road', 'railway track', 'bridge for cars only'], 'side of the road facing traffic'),
                $this->tf('Following road signs keeps road users safe.', true),
                $this->mc('A yellow traffic light warns you to ______.', ['slow down and be careful', 'stop forever', 'speed up', 'close your eyes'], 'slow down and be careful'),
                $this->mc('When riding in a car, children should wear a ______.', ['seat belt', 'backpack', 'sweater', 'hat'], 'seat belt'),
                $this->tf('It is safe to cross between parked cars.', false),
                $this->mc('Road safety is the responsibility of ______.', ['all road users', 'only drivers', 'only children', 'only police'], 'all road users'),
                $this->mc('Pedestrians should not ______ while crossing.', ['run or play', 'walk steadily', 'look both ways', 'use the crossing'], 'run or play'),
                $this->tf('Road signs give important information to drivers.', true),
                $this->mc('To be safe on the road, drivers should ______.', ['obey speed limits', 'drive very fast', 'ignore signals', 'text while driving'], 'obey speed limits'),
                $this->tf('Road safety rules protect both drivers and pedestrians.', true),
            ],

            'Unit Four: Endemic Animals in Ethiopia' => [
                $this->mc('What does "endemic" mean?', ['Found only in one place', 'Found everywhere', 'Very common', 'Imported from abroad'], 'Found only in one place'),
                $this->mc('Which animal is endemic to Ethiopia?', ['The gelada baboon', 'The polar bear', 'The kangaroo', 'The tiger'], 'The gelada baboon'),
                $this->tf('Endemic animals are found only in Ethiopia.', true),
                $this->mc('The Ethiopian wolf is a ______ animal.', ['rare and endangered', 'very common', 'domestic', 'farm'], 'rare and endangered'),
                $this->mc('The Simien fox is also known as the ______.', ['Ethiopian wolf', 'gelada', 'zebra', 'lion'], 'Ethiopian wolf'),
                $this->tf('Many endemic animals live in the mountains of Ethiopia.', true),
                $this->mc('The nyala is a type of ______ found in Ethiopia.', ['antelope', 'bird', 'fish', 'snake'], 'antelope'),
                $this->mc('Endemic animals are important because they make Ethiopia ______.', ['special and unique', 'ordinary', 'the same as others', 'less valuable'], 'special and unique'),
                $this->tf('We should protect endemic animals from extinction.', true),
                $this->mc('The main threat to endemic animals is ______.', ['loss of habitat', 'too much rain', 'too much food', 'cold summers'], 'loss of habitat'),
                $this->mc('National parks help to ______ endemic animals.', ['protect', 'harm', 'hide', 'ignore'], 'protect'),
                $this->tf('Endemic animals are not important for tourism.', false),
                $this->mc('The gelada baboon is also called the ______ baboon.', ['bleeding-heart', 'laughing', 'sleeping', 'jumping'], 'bleeding-heart'),
                $this->mc('Wild animals should not be ______.', ['hunted illegally', 'protected', 'observed', 'protected in parks'], 'hunted illegally'),
                $this->tf('Protecting families of animals helps them survive.', true),
                $this->mc('Endemic animals are protected so that ______ can see them too.', ['future generations', 'only today\'s people', 'no one', 'just the animals'], 'future generations'),
                $this->mc('The homeland of the gelada baboon is the ______ highlands.', ['Ethiopian', 'European', 'Siberian', 'Arabian'], 'Ethiopian'),
                $this->tf('Caring for the environment helps endangered animals.', true),
                $this->mc('Countries work together to ______ rarity of nature.', ['protect the', 'destroy the', 'hide the', 'increase the loss of'], 'protect the'),
                $this->tf('Endemic animals are a treasure of Ethiopia.', true),
            ],

            'Unit Five: Dairy' => [
                $this->mc('What is dairy?', ['Products made from milk', 'Products made from stone', 'Products made from wood', 'Trade in clothes'], 'Products made from milk'),
                $this->mc('Which of these is a dairy product?', ['Cheese', 'Bread', 'Cotton', 'Paper'], 'Cheese'),
                $this->tf('Milk is good for strong bones.', true),
                $this->mc('Butter and yoghurt are made from ______.', ['milk', 'sand', 'leaves', 'soil'], 'milk'),
                $this->mc('Which animal gives the most common dairy milk in Ethiopia?', ['The cow', 'The chicken', 'The donkey', 'The camel only in towns'], 'The cow'),
                $this->tf('Dairy products give us proteins and calcium.', true),
                $this->mc('Farmers who keep cows for milk are called ______.', ['dairy farmers', 'fishermen', 'bakers', 'carpenters'], 'dairy farmers'),
                $this->mc('Fresh milk should be kept ______ to stay safe.', ['cool and clean', 'in the sun', 'in warm dust', 'open in the field'], 'cool and clean'),
                $this->tf('Milk must be clean to be safe to drink.', true),
                $this->mc('To get good quality milk, cows should be ______.', ['healthy and well fed', 'tired and hungry', 'left in the heat', 'ignored'], 'healthy and well fed'),
                $this->mc('Dairy products are important for ______ growth.', ['children\'s', 'only plants\'', 'only rocks\'', 'machines\''], 'children\'s'),
                $this->tf('Boiling milk before drinking helps to kill germs.', true),
                $this->mc('Cheese is made by ______ milk.', ['processing', 'burning', 'freezing only', 'burying'], 'processing'),
                $this->mc('Dairy farming can provide ______ for families.', ['income', 'dust', 'noise', 'pollution'], 'income'),
                $this->tf('Dairy animals should be vaccinated against diseases.', true),
                $this->mc('Keeping the milking area clean prevents ______.', ['contamination', 'good health', 'clean milk', 'strong animals'], 'contamination'),
                $this->mc('Milk contains a mineral called ______ that builds strong teeth.', ['calcium', 'sand', 'salt only', 'water only'], 'calcium'),
                $this->tf('Dairy products are a good part of a balanced diet.', true),
                $this->mc('Good care of dairy animals gives ______ milk.', ['more and better', 'less', 'dirty', 'sour always'], 'more and better'),
                $this->tf('Healthy cows produce safe and nutritious milk.', true),
            ],

            'Unit Six: Land Conservation' => [
                $this->mc('What is land conservation?', ['Protecting the land from damage', 'Building on all land', 'Destroying the soil', 'Leaving land unused forever'], 'Protecting the land from damage'),
                $this->mc('Planting trees on hills helps to ______.', ['prevent soil erosion', 'increase flooding', 'dry the soil', 'remove the land'], 'prevent soil erosion'),
                $this->tf('Trees help to hold the soil with their roots.', true),
                $this->mc('Removing trees from hills without replanting causes ______.', ['soil erosion', 'good crops', 'rich soil', 'clean rivers'], 'soil erosion'),
                $this->mc('A terrace on a hillside helps to ______.', ['slow water and save soil', 'wash away soil', 'flood the farm', 'dry the land'], 'slow water and save soil'),
                $this->tf('Burning vegetation on hills causes land damage.', true),
                $this->mc('Conserving land is important for ______.', ['future food production', 'losing the soil', 'more pollution', 'building wastelands'], 'future food production'),
                $this->mc('Rotating crops helps to ______.', ['keep the soil fertile', 'remove the soil', 'dry the field', 'plant weeds'], 'keep the soil fertile'),
                $this->tf('Overgrazing can destroy grassland.', true),
                $this->mc('The top layer of the earth where plants grow is called ______.', ['soil', 'rock', 'sand only', 'clay only'], 'soil'),
                $this->mc('Planting trees along borders of fields is called ______.', ['windbreaks', 'concrete walls', 'stone towers', 'fences of metal'], 'windbreaks'),
                $this->tf('Adding compost improves the quality of the soil.', true),
                $this->mc('Soil carried away by water is called ______.', ['erosion', 'irrigation', 'sowing', 'harvest'], 'erosion'),
                $this->mc('Farmers should avoid ______ that harms the land.', ['overgrazing', 'planting trees', 'using compost', 'terracing'], 'overgrazing'),
                $this->tf('Healthy soil is essential for growing food.', true),
                $this->mc('Grasses and small plants protect soil from ______.', ['being washed away', 'growing', 'staying fertile', 'holding water'], 'being washed away'),
                $this->mc('The government and people should work together for ______.', ['land conservation', 'land destruction', 'wasting land', 'polluting soil'], 'land conservation'),
                $this->tf('Conserving land helps the whole community.', true),
                $this->mc('A land that is conserved can produce food for a ______.', ['long time', 'single day', 'short hour', 'second now'], 'long time'),
                $this->tf('Protecting the land protects our future.', true),
            ],

            'Unit Seven: Volunteerism' => [
                $this->mc('What is volunteerism?', ['Working to help others without pay', 'Working only for money', 'Refusing to help', 'Sleeping all day'], 'Working to help others without pay'),
                $this->mc('A volunteer helps others ______.', ['freely and willingly', 'for a big salary', 'by force', 'only in secret'], 'freely and willingly'),
                $this->tf('Volunteers help to improve their community.', true),
                $this->mc('Cleaning the neighborhood is an example of ______.', ['volunteering', 'earning', 'avoiding work', 'arguing'], 'volunteering'),
                $this->mc('Volunteers do NOT expect ______.', ['money in return', 'to help people', 'to give time', 'to do good'], 'money in return'),
                $this->tf('Anyone can be a volunteer regardless of age.', true),
                $this->mc('Helping the elderly and the sick is a form of ______.', ['volunteerism', 'selfishness', 'laziness', 'carelessness'], 'volunteerism'),
                $this->mc('Volunteering helps the volunteer to ______.', ['learn new skills', 'earn easy money', 'avoid work', 'waste time'], 'learn new skills'),
                $this->tf('Volunteerism strengthens the community.', true),
                $this->mc('A volunteer should be ______.', ['helpful and kind', 'lazy', 'selfish', 'rude'], 'helpful and kind'),
                $this->mc('Working together freely is called ______.', ['cooperation', 'competition only', 'fighting', 'isolation'], 'cooperation'),
                $this->tf('Volunteers receive money for their time.', false),
                $this->mc('Volunteering teaches responsibility and ______.', ['care for others', 'greed', 'hatred', 'selfishness'], 'care for others'),
                $this->mc('Students can volunteer by ______.', ['helping in the community', 'refusing to study', 'ignoring people', 'wasting resources'], 'helping in the community'),
                $this->tf('Volunteers make their community a better place.', true),
                $this->mc('The reward of volunteering is mostly ______.', ['satisfaction and growth', 'big money', 'fame alone', 'free food'], 'satisfaction and growth'),
                $this->mc('A volunteer gives their time and ______.', ['effort', 'bad attitude', 'fear', 'anger'], 'effort'),
                $this->tf('Only adults can volunteer.', false),
                $this->mc('Volunteer work shows that people ______.', ['care about each other', 'avoid each other', 'fight together', 'compete always'], 'care about each other'),
                $this->tf('Volunteerism helps to build a caring society.', true),
            ],

            'Unit Eight: Fitness' => [
                $this->mc('What is fitness?', ['Being healthy and strong through exercise', 'Sitting all day', 'Eating too much always', 'Sleeping long hours'], 'Being healthy and strong through exercise'),
                $this->mc('Which activity improves fitness?', ['Running and playing sports', 'Sitting all day', 'Watching TV', 'Sleeping'], 'Running and playing sports'),
                $this->tf('Exercise keeps the heart and body strong.', true),
                $this->mc('Drinking enough ______ is important during exercise.', ['water', 'soda only', 'oil', 'mud'], 'water'),
                $this->mc('Eating fruits and vegetables helps to stay ______.', ['fit', 'weak', 'lazy', 'sick'], 'fit'),
                $this->tf('Fitness is important for a healthy life.', true),
                $this->mc('Daily exercise helps to ______.', ['improve health', 'lose strength', 'feel tired', 'become sick'], 'improve health'),
                $this->mc('Which of these is a fitness activity?', ['Walking briskly', 'Sleeping all day', 'Eating sweets', 'Watching screens'], 'Walking briskly'),
                $this->tf('Rest and sleep are also part of staying fit.', true),
                $this->mc('Regular exercise can make you feel ______.', ['full of energy', 'very tired', 'sad', 'lazy'], 'full of energy'),
                $this->mc('To be fit, we should move our bodies ______.', ['every day', 'once a year', 'never', 'only when sick'], 'every day'),
                $this->tf('Playing sports is good for both body and mind.', true),
                $this->mc('A balanced diet gives the body the ______ it needs.', ['energy', 'nothing', 'only taste', 'only color'], 'energy'),
                $this->mc('Fitness helps prevent ______.', ['some diseases', 'all good things', 'healthy growth', 'strong bones'], 'some diseases'),
                $this->tf('Exercise should be done at the right amount, not too much.', true),
                $this->mc('Warming up before exercise helps to ______.', ['avoid injury', 'lose energy fast', 'get tired fast', 'hurt muscles'], 'avoid injury'),
                $this->mc('Students can stay fit by ______.', ['playing during break', 'sitting all day', 'eating only snacks', 'watching screens'], 'playing during break'),
                $this->tf('Fitness is important for children too.', true),
                $this->mc('Good fitness helps us to ______ well.', ['study and work', 'avoid everything', 'stay home', 'skip school'], 'study and work'),
                $this->tf('Exercising regularly is a healthy habit.', true),
            ],

            'Unit Nine: Self-Expressions' => [
                $this->mc('What is self-expression?', ['Sharing your feelings and ideas', 'Hiding your thoughts', 'Copying others', 'Staying silent always'], 'Sharing your feelings and ideas'),
                $this->mc('Which of these is a way to express yourself?', ['Writing or speaking your ideas', 'Never talking', 'Ignoring others', 'Copying everyone'], 'Writing or speaking your ideas'),
                $this->tf('Everyone has the right to express their ideas.', true),
                $this->mc('Self-expression should be done with ______.', ['respect for others', 'anger', 'noise always', 'fear'], 'respect for others'),
                $this->mc('Choosing your own clothes can be a form of ______.', ['self-expression', 'copying', 'hiding', 'confusion'], 'self-expression'),
                $this->tf('Expressing feelings honestly is healthy.', true),
                $this->mc('Drawing and art are ways to show your ______.', ['feelings and ideas', 'parents\' money', 'height', 'weight'], 'feelings and ideas'),
                $this->mc('Talking about problems helps to ______.', ['feel better', 'worry more', 'stay angry', 'hide feelings'], 'feel better'),
                $this->tf('It is rude to force others to express like you.', true),
                $this->mc('Expressing opinions in a calm way shows ______.', ['maturity', 'anger', 'laziness', 'rudeness'], 'maturity'),
                $this->mc('Each person\'s expression is ______ and valuable.', ['unique', 'the same', 'useless', 'unimportant'], 'unique'),
                $this->tf('Self-expression helps others understand you better.', true),
                $this->mc('Writing a diary is a way to ______ your feelings.', ['record and express', 'hide', 'forget', 'copy'], 'record and express'),
                $this->mc('Good communication means ______.', ['listening and speaking with respect', 'only shouting', 'interrupting', 'staying quiet always'], 'listening and speaking with respect'),
                $this->tf('Expressing anger through violence is healthy.', false),
                $this->mc('Your ideas are important, and you can share them ______.', ['politely', 'by fighting', 'by hiding', 'by ignoring'], 'politely'),
                $this->mc('Respecting others\' opinions is part of good ______.', ['self-expression', 'confusion', 'force', 'argument without end'], 'self-expression'),
                $this->tf('Balancing your own expression with respect keeps peace.', true),
                $this->mc('When you express yourself, others can learn to ______ you.', ['understand', 'avoid', 'fear', 'ignore'], 'understand'),
                $this->tf('Everyone\'s unique expression deserves respect.', true),
            ],
        ];
    }
}
