-- Seed: "Everyone, Everyday" — Chapter 1 & 2
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: skips if the series already exists for this user.

DO $$
DECLARE
  v_user_id    uuid;
  v_series_id  uuid;
  v_ch1_id     uuid;
  v_ch2_id     uuid;
  v_ch1        text;
  v_ch2        text;
BEGIN
  -- ── 1. Resolve owner user ───────────────────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'huslen.mungun1@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user not found in auth.users. Check the email address.';
  END IF;

  -- ── 2. Guard: skip if already seeded ────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM series
    WHERE title = 'Everyone, Everyday' AND user_id = v_user_id
  ) THEN
    RAISE NOTICE 'Series "Everyone, Everyday" already exists — skipping.';
    RETURN;
  END IF;

  -- ── 3. Insert series ─────────────────────────────────────────────────────────
  INSERT INTO series (user_id, title, description, language, published, audience)
  VALUES (
    v_user_id,
    'Everyone, Everyday',
    'A one-sided love story between a Mongolian mover working in Korea and a Korean artist — told from both sides.',
    'en',
    false,
    'all'
  )
  RETURNING id INTO v_series_id;

  -- ── 4. Chapter 1 content ─────────────────────────────────────────────────────
  v_ch1 := $ch1$I live in Korea and I work at a moving company. Well, actually, I'm a Mongolian student just trying to earn money to pay for my school tuition. Let me talk a little about my work.

This shit starts at 7:30 in the morning and ends around 5 to 6 pm. It rarely ends early, and I hate it. Sometimes we have to go far, and on those days the fucking work starts at 4 or 5 in the damn morning, and I hate it.

My colleagues are a bunch of assholes and I hate them, but I gotta hide my expressions because I need to get along with the idiots I hate to keep this job just for a bit. I've been doing this job for quite a while and I hate it.

Other guys and friends from my country seem to enjoy it, and I hate the way they brag about how they get to work often and make more money than each other. Because you see, this job is actually one of the harder jobs in Korea. Most young people live in rented homes, so when the rent is over they gotta move out.

Real estate in South Korea is extremely developed because of the landscape and the population. There are too many mountains and not much flat land. Because of that, some assholes make a living just by helping civilians move to another place to live, and they charge something like 1000 grans or more. Well, the boss takes the most, and I claim it's pretty reasonable because they own the big trucks and the special vehicles. One of them even has a huge ladder lift that can carry up to 500 kilograms, almost like the aerial ladder on a fire truck, just not painted red.

For example, when people move to another place and they can't carry their refrigerators and washing machines by themselves, they gotta hire some dudes to clean their shits. And these fuckers got like two to four refrigerators. Even worse, they sometimes have a separate refrigerator just for kimchi.

Why the fuck would someone want four or five refrigerators in their no space tiny as fuck home?

Of course they're heavy, but that's not even the worst part. They are throat souring filthy. The juice leaks out, the smell is horrible, and there's dust mixed with oily steam on top of them. I don't even want to talk about their washing machines.

Some people sleep on stone beds, common for many Asians but not for Mongolians. And I gotta say, that rock bed, damn that thing is heavy like a dead cow, maybe even heavier.

Heavy furniture itself is not the worst thing. Sometimes you find dirty socks, used condoms, sex toys, juicy trash, dog and cat hair, dust that destroys your allergies, and bugs. Giant insects. Clean your home do some chors, guys.

In summer it's unbreathable hot.
In winter it's bone-aching cold.

But that's not actually why I'm telling this story.

This was supposed to be a love story.

Finding love in Korea is nearly impossible for someone like me who works dirty jobs and hasn't graduated yet. Education and income are very important for many Korean girls. Not all of them, but many. You gotta be shiny, handsome, tall, athletic, well educated, and rich to get yourself a confident looking, well-raised wife.

Yeah, yeah, there are some lucky fellas who found the exact opposite of themselves even though they got none of the things I mentioned.

What makes it nearly impossible for me is that I'm a foreigner. Not American or some Westerner. I'm from Mongolia. It's not like I'm ashamed of my nationality. It's just that people seem to like Mongolians a little less than other foreigners.

Like I said, it's a love story. A one-sided love story, sadly.

But before I get to that part, let me say one thing.

Many Koreans don't realize how hard these dirty jobs really are, especially house moving jobs. Even some Korean employees suck at their job either. They fucking wooden spoon in the shelf.

It's the hurtful truth of uneducated Koreans who think there is no greater country than South Korea. It has always been the part-timers doing the dirtiest jobs for them.

Maybe it's in our blood. We nomads might just be good at using our heads without even trying. That's why there are so many victims of the Mongolian government working for Korea, mostly doing the home moving jobs. And honestly, we're very good at it, sometimes even better than the main employees.

Still, I hate this job.
I hate the school I go to.
I hate how hard I work just to pay for the school that I hate.

But something funny and unexpected happened earlier today at work.

There was this girl who looked about my age. I think she was the house owner's daughter. She looked strangely familiar, like my first crush when I was in first grade.

I can't stop imagining her eyes.

She was cool. I would say she wasn't much of a friendly type, but her eyes, the way she looked at me. There was no disgust in her eyes.

We looked at each other a few times. Maybe she caught me looking at her or maybe I caught her looking at me. I don't know.

There's no way she would have liked me. Maybe she was just curious seeing a young man working with a bunch of ugly old guys. Or maybe she was curious because I clearly wasn't Korean.

But she was beautiful.

Her sea like calm predator eyes, the way she dressed, it matched her vibe perfectly. It felt like she was naturally perfect all the time. Her voice was strong but gentle, not like those other whinny bitches around.

She seemed very independent for a young woman living with just her mother in an old small house.

The cleanest girl I ever saw.

There was something else that made me fall for her even more. I'm not completely sure, but I saw paintings and painter tools. It could have been her mom's, but the paintings looked too childish for an older woman and too advanced for a little kid.

I'm actually a bit of an artist myself too, so I easily fall for artistic girls but this girl buried me alive.

My heart started beating in strange, unpredictable rhythms. I can't stop imagining the way we looked at each other.

I'm not that shy. Honestly, I'm a cracked face chance taker. If I like something, I go for it no matter the cost. I even play dirty if I have to.

If I had even one chance, I would sell my soul to make her mine.

But I had no chance though.

I was scared of losing myself chasing a woman who would never slow down enough to wait for me on her highway of success.

She was a Ferrari.

And I'm just a guy with a bicycle.

She pays people to move her life to another house.
And I'm the guy who helps the couriers just to make a living.

Falling in love is supposed to feel nice, but instead it hurts. I'm angry at myself for losing my mind over someone who was just a shooting star passing through my life.

God I hate myself.

Out of all the girls in the world, why her?

I thought maybe writing this down might make me feel a little better.$ch1$;

  -- ── 5. Insert Chapter 1 ──────────────────────────────────────────────────────
  INSERT INTO chapters (series_id, chapter_number, title, content, is_published)
  VALUES (v_series_id, 1, 'The Mover', v_ch1, false)
  RETURNING id INTO v_ch1_id;

  INSERT INTO chapter_translations (chapter_id, locale, title, script)
  VALUES (v_ch1_id, 'en', 'The Mover', v_ch1);

  -- ── 6. Chapter 2 content ─────────────────────────────────────────────────────
  v_ch2 := $ch2$Funny how a mature independent young lady like me keeps thinking of a random guy who works as a laborer. It was about a week ago I came to my old hometown, to my mom's place, from Seoul where I live, to bring my mom closer to me. I bought an apartment around new Jamsil, that's not that important. I didn't actually buy the whole place, it's a kind of loan. Anyways, moving on. A week ago I came late to my mother's home and we spent the night together like old times, we had to move to Seoul the next day so we sort of prepared some things. Next day, first thing in the morning when it was almost 8 am, the movers came and one of them caught my eye. Different from the others. He was younger, brighter, in good shape, not that tall but handsome. People who usually work as laborers work in difficult conditions, their physique and skin tones change, they eat fast and that causes stomach issues, making them have bad smells, they drink a lot, I mean all Koreans drink a lot but I just heard from a friend that people who couldn't succeed in school have no other choice than to work as labor workers. Well we should respect them but some don't. As my friend mentioned, uneducated labor workers are similar to the northerners, thinking that there is no greater nation than Korea. I know that working class people built this country but honestly I wouldn't want to end up marrying one. I even never thought about getting married, I graduated from the fine arts class at Seoul National University, I sell my arts at a high price, I don't have a work time schedule, I even have my own art studio and teach many kinds of people art and when it comes to noticing people's talent I can tell what kind of person that is just by watching. Trust me I have been teaching classes to many people, I know how artists move and act at some certain moments and I know he is an artist, I just know it. It was just like he somehow kind of mesmerized me, I was actually looking for him, really wanting to see his face, his eyes, how he works, the way he freezes and thinks how to work and that's when I found myself going crazy. I mean he was cute, pretty charming for a labor worker. He wasn't that friendly and I don't even think he is Korean. I don't care where he is from but he was the most handsome Mongolian I ever saw. It's crazy I am still thinking about him, it's just that he was so nice and warm to look at like staring at melting chocolate and fading into hot milk, my heart melted and faded into his hot flaming eyes but his spark though, I saw a lot of sadness and suffering in it, his eyes were deep and soft, deeper inside it was dark and blue, white like snow, red like flames, empty but full, full of joy but lacking happiness. I don't know what I was looking for, it's just a simple thought of how a man could have experienced so many things. Anyways this kind of talking is just leading to some philosophical type of psychology thing, I might be blabbering, let's get to the point. I am not gonna hide that I really liked him, not thinking that our social status is different but he had the vibe of keeping restrictions from a relationship or he had a child or two, maybe not sure and poking in the eye he caught me staring at him. My god he caught me multiple times, he must have thought that I was some kind of weirdo or I was looking at him with revulsion. That friend I mentioned told me that many Koreans don't like outsiders and that's why I thought he felt some aversion from me. I have this frosty stare in me, many men keep their distance from me because of it, they look scared, well it's okay I don't care. After a long day at the end I felt the same flinch from him. I messed it up again, he would have made a great husband, a man of the house. He was like he had some important thing to do, just rushed to leave. And now I hate myself. I have seen this guy for the first time but he seemed strangely familiar like I knew him for my whole life and that's why I might be feeling that I miss him so much just like someone so close to me went somewhere so far. It has always been just the two of us, mom and me since dad left us when I was just a little girl and for all these years my mom had been working so hard, spending all her youth in her office, she even stayed late for bonus salary just to pay for my tuition and other things, handing me pocket money she used to say, "such a beautiful girl must never go out with empty pockets, we are not poor, we are rich, so act like you are from a filthy rich family" although I always knew we were poor. Mom never forced me to be someone successful like early 2000 parents wanted their children to be doctors or lawyers and forced their kids to study day and night, not my mom, she was different, she wanted me to be happy every day all the time. She wanted me to do what I really want, marry the man I love, live where I like, make a life of my dreams. I loved colors even since I was little, I wanted to paint everything with the colors I desire. So I became an artist. When I finished high school I left home to the big city and I got in the best university. My mom left her job, moved out with me and in Seoul mom had to do everything she found to pay my burdens. Mom worked at factories, food courts, house cleaning services, farms, butcher shops, at the market to sell smelly fish. I couldn't just watch my poor mom suffer alone, I wanted to help my mom, at least not to bother. Mom was always late but mostly not home but that day she came home early for the first time with a bag full of treats but I wasn't home. She found me at the next street cafe wearing an apron. When I walk to school I always pass through a coffee place near my home. I had no thoughts, just got in and asked if they needed an assistant. The owner of the place was a nice lady, she welcomed me like she always knew me and knew that I needed money, how desperate me and mom were to survive. She always saw me through the windows and knew the exact time when I leave and come. No one would believe this but she even guessed my name. Yes she was the master of reading people, I learned a lot from her. It was my second or third week working there when my mommy came in with a bag, eyes full of tears. She was furious, her voice was shaking, she cried and asked me why. Let's cut this part, she thought I dropped out from school but I didn't and my boss lady talked with my mom, they spent the whole night with laughter and hand holds. Kind of pointless thing I wrote down. I worked at the cafe until graduation, after graduation my mom went back to her hometown, after four years I am retiring my old mother and that was the day I saw him. It sounds lunatic, it is and I am crazy I already lost my mind writing this short story hoping I might calm down.$ch2$;

  -- ── 7. Insert Chapter 2 ──────────────────────────────────────────────────────
  INSERT INTO chapters (series_id, chapter_number, title, content, is_published)
  VALUES (v_series_id, 2, 'The Artist', v_ch2, false)
  RETURNING id INTO v_ch2_id;

  INSERT INTO chapter_translations (chapter_id, locale, title, script)
  VALUES (v_ch2_id, 'en', 'The Artist', v_ch2);

  RAISE NOTICE 'Done. Series ID: %. Chapter 1 ID: %. Chapter 2 ID: %.', v_series_id, v_ch1_id, v_ch2_id;
END;
$$;
