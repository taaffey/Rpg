# Playtest guide

The game has been tested by bots (a balance sim, a progression sim, a randomized UI fuzzer, device-size screenshots and a 100-step
browser regression) but not yet by many humans. This page is for the humans. Play normally; none of this is a script.

## Before you start
- Phone or iPad, the published link. Headphones optional, but the music is half the joke.
- **Options > Report a problem** copies a block of text (build id, device, what you were doing, the last few events). Paste it into a message
  whenever something feels off. A screenshot helps too. You do not have to work out what went wrong.
- Options also has: text speed, menu size (small hands, big thumbs), random-fight rate and a mute. Try changing them; tell us which you needed.

## A good first session (about an hour)
1. **New Game > Normal.** Do the pub scene, wake up in Haven, find the Goose's cellar. Big Gary is the first boss.
   - Did you notice the red **WIND-UP** strip? Did you understand what to do about it (hit it hard, or Guard)? What did you do?
2. Haven shopping with 400 gold: what did you buy and why? Was it obvious who could use what?
3. Take callings at the Guild. Which ones did you pick? Did the descriptions tell you what they do?
4. Walk out to the Ashen Cavern. Were you ever lost? Did you find a **twinkle** off the path (a hidden chest)?
5. The Ashen Wyrm. Did the fight feel fair? Did you stagger it, Guard through it, or just heal?

## What we most want to know
- **Difficulty.** Where did you first lose a fight, and did it feel like your fault or the game's? Which boss felt best?
- **Boss wind-ups.** Is Guard ever the right call, or do you always just attack? Did the bar fill when you hoped it would?
- **Clarity.** Anything you could not read, reach, or work out without asking someone? Text too small or too fast?
- **Pacing.** Any stretch where you walked too long with nothing happening, or fought too many random fights?
- **Hints.** There are no tutorial pop-ups on purpose; hints live in the world (NPCs, roadside strangers, signs). Did you find them? Miss them?
- **Jokes.** Which line made you laugh? Which fell flat? (Seriously. The tone is the product.)
- **Crashes and soft-locks.** A hang, a blank screen, a button that did nothing, a save that did not load. The report text is gold here.

## Things worth trying later
- Change callings mid-game, socket gems, hunt the side quests (the journal lists them), ride the N9 bus, take the ferries.
- Finish the story, then **New Game+** with a house rule or two.
- Switch to **Hard** for a boss you found easy.
- Switch **Menu size** to Large or Huge on a small phone.

## Known limits
- Balance was tuned with bots that never Guard and never use items between fights (see `tools/skillsim.mjs` for how much Guarding and staggering
  should help). Human play is likely to be easier than the bot numbers suggest; how much easier is exactly what we want your feedback on.
- Audio only starts after your first tap (a browser rule).
- Saves live in the browser for that link. **Options > Back up saves** makes a code you can paste elsewhere (Restore saves puts it back).
