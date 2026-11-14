-- Migration: Add Star Player attributes (rating, playstyle, image)
alter table listings add column if not exists star_player_rating int check (star_player_rating between 50 and 120);
alter table listings add column if not exists star_player_playstyle text;
alter table listings add column if not exists star_player_image text;

-- Allow authenticated sellers to update these fields
grant update (star_player, star_player_rating, star_player_playstyle, star_player_image) on listings to authenticated;
