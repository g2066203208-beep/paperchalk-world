# V29: Normandy period streets / calm pixel materials

## References
- Caen municipal archives: https://caen.fr/inventaires-des-archives-municipales-et-communautaires
- Caen 1936 source methodology: https://caen1936.fr/sources/
- Rue Saint-Pierre historic postcard: https://www.fortunapost.com/caen/63831-14-caen-rue-saint-pierre-nombreux-commerces-1922.html
- Saint-Lô Rue Torteron: https://www.fortunapost.com/50-manche/29639-carte-postale-ancienne-50-saint-lo-rue-torteron-1916-gendarmerie-nationale-et-epicerie-parisienne.html

## Executed tests
- Executed current generateCity and shared triangles emitter: 214 buildings, 131 shops, 3 bridges, 50,830 parts, 612,776 city triangles, all finite.
- Executed extendAtlas: 786,432 bytes, original atlas region retained by copy. Removed per-texel random grain in extended city materials.
- walkHeight sampled central bridge approach and deck at z=-150,-100,-30,0,30,100,150; finite values.
- Independently software-rasterized four views of actual generated city geometry and new atlas; not the game's browser GPU renderer.

## Not accepted yet
- Historic city remains fictional, not a surveyed reconstruction of Caen or Saint-Lô.
- Street grid, visual massing, prop density and lighting still need work; road surface scale must be checked in the actual GPU renderer.
- Triangle count increased substantially, especially shop lettering and facade details. Browser FPS, route/collision regression and walking GIF not verified in this revision.
- Keep new material IDs stable, preserve original trench and character assets. Optimize geometry and inspect real browser frames before acceptance.
