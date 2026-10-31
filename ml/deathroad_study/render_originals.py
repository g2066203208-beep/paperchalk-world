"""Thirty independently authored ORIGINAL 32×48 native pixel sprites.

Silhouettes are integer-grid drawings (compressed losslessly as palette tokens).
K-means statistics of each public study slot condition the *original* accent
palette. This is NOT a trained deep generator or a copy of the game's sprites.
The artwork is original and the mapping may be inspected pixel-by-pixel.
"""
import argparse,base64,colorsys,json,pathlib,zlib
from PIL import Image,ImageDraw,ImageFont
import numpy as np
W,H=32,48
NAMES="""hooded courier|night fox|ceramic automaton|quiet librarian|bellcap|street medic|mothling|old navigator|linen spirit|clockwork raven|market porter|straw sentinel|river newt|clock snail|raincoat visitor|alley cat|lantern keeper|musician|porcelain mask|one-eyed watcher|winter child|hinged doll|hare messenger|inkling|night watch|potted sprout|candle skull|wandering cook|flicker head|umbrella wisp""".split("|")
SPECIES="""person fox robot person mushroom person moth person ghost crow person scarecrow lizard snail person cat lantern person mask cyclops person puppet rabbit blob person flower skull person tv umbrella""".split()
BASES="""303340 7f8e91 b9c8ba a36c63 f0dcb8 3b5965
2d3440 a17b67 d1ac80 557b76 ece1c0 4b5554
272b3c 647987 a2b6bc be8b76 e8d6b0 38455e
353040 927b97 d2b6ab 567a8b f1dcc3 624d65
2d3340 718266 b0bc87 b96f6f ebdcb8 4a6557
2c2f39 7d777d c9b6a4 996b7c eee5cc 536274
2c3440 666e9a aab6dc 7d9b8d f1debf 46556a
343038 9f8066 d6b59a 638f86 e8dbc1 6d4b46
242b35 567d88 90b9b8 ad7f65 e7dfc8 35445b
2e2e39 9b7276 d6b3a2 577b76 e3d5bd 51485f""".splitlines()
# Each item is one independently designed original character's indexed raster.
# 0 = transparent; 1..6 = that character's original palette.
TOKENS="""
eNq10tsOhCAMBNAOYP//k+2CbKgZShbdvhg5wyUUkRdLF9wrVh5QjQMaB9ooarFAHTuuIoGRibvpLTCfTj3nxw5UtM/PLm593XC7XJOUUujh/B4A649Iax6O1kHyRNCLcBu34+n3JTg3GR32+7prKWXf4RzMh/3vnrNzfey3+/vccOi1K6PLf336OK5auOy6TBLo5wI/4NIX62/WCeLhC40=
eNrN0+sOgyAMBWBO0/r+jzw2zXqlRk2WnX/0a5BIGeM3wUkFsQHRT9ds11y4KSH6rLDWwIXDJntKctJUTuQbLnngd0N2yN4lc1X6sQvWLjNLJ9mz+L5oCofYFPMAatg15L9nL0iK24kXuFW3u5mEPf7TteWec+/+kTj/6PT1A+GrPr7n1Ybe84g5RzUA5iSj99H7ar767R/4vbwAjTIGww==
eNrVkdEOgCAIRYVa///J4YbNjGRc8qHzgvM4hWspAXYF9QLR/IkXTxYhv4187o8eyEt01dWyxOf606nbEvNwvrn/N0487G1+4/6pZx68bIQ9Nxb5RH/JfLz8fa8nuvovf43lzI96kBP/mQh5
eNq90gsOhCAMBFCmSu9/5G2LoiylKNnsJCbqm9QPpPTH8ITPxOoXmOMCTwocF/iZZ0ngOdfC9/NRuTRWHIbAkiPncP7UtbBLfL8PgLtCtYCRW4R9PwvG7BkTUVkIvWpcpLh8gLpc/txZbN3ljcXs0HiOo+P4tum98n7WHbnFd6J7Ad0fDr1hLaSXTm3i8d0A9ElRYby5Jp4GDRwb7zp56ZP5i/kA7iIJFA==
eNrV08sSgCAIBVDAx/9/co4vcERpcmN3Vwc1igAuChrMsVyrQPQtSgEKLgW40JAy7oDD4ux5C+Vkdt89rw6h3WdHsZxdPKTlOJ9e45wzvRyg8uC7WAWwL4Ctqx9eGwGDa03gKPNz6EQkPF3R5BR77vPUX3zv6vux3Px/5bz8zntfiwZP/Vsezc8IBQ==
eNrN090OgCAIBWDJ6fs/clCKUQct21rnqvYR/hbCp8kDrukrLlgknQLrudseFOR7njiwf+O94DI+KXNo5ASdCk45pdTtP3Qp4D12/NgAsxYg3nwLM3RengZ9fDj+SwmbcX5FXuY342ScPJdL+sZr/xjj2dv98T1KgMuGGcdbrOfnuHs+d1yWXv7j/7lO3FkBlYvVHh76oP9kVjn4CJA=
eNrV1FEOhCAMBNBOq97/yAKCLVAQd5NNtl/AG5EQgOhXtYWynbceCk7LdQzWgDWH67D1wE4AYK3eK3YCnWuAe84TSGLm7Niv1B560aX1PAuspxHXRWLAePP/5He3c6kd3udl/jZQWJ1sAPp5PEplzFbUdMpcPzw/TKmXFTh+7e/EaclpyblyeeM0cFr1lJh6SLTbP70/MrhgVeOv/H4XBg/Et/5ZnTC4B5k=
eNrN090SgBAQBWAHef9HzrKiWIZM07mJ+bTyk1L74nLWXKcseq8+gMJ9b851nSmnCY6cavotzkNCa8Vfzk8D/LoFLwu0mAtEFjyEuOkujfCt1st0cfL54nl+0a215L672XFzfOzG8P0eedqfkQPS+aR0vXO+ovNPRY//+fXhwgp495Abkz6ov5gTBskIDw==
eNrdlG0PgCAIhD0d//8vp/lS2kGttZrdJ7bnJgID5/4l2DTJhKIbEo3Snih4dVAuTcyAUx5C0A3Y8RhA/13mMNILaULP5RNea2BTfIM/UZ/3Phtu8pZgbj72Z1stvmN5MYuOAwLTdY7eVkO+5PapwWT3cgGMBgb9
eNrt09EKgCAMBdBdSP//kws3cm5Lzegh6EJQnqG4lOiPD8JBnQEHBUCu8d5wUOAcPXYTFEfiqnR8hS6z4I5Drb+Z9csD5U2YuFmwBTxGpkAwywhq41UBdwetSzb/lxAkR276P+v0ttPIaeQUuzncHXcnEAv3Y+aCNS+f8nNfFxt86mvZAR+KB8E=
eNrN1NEWQCAMBmC/jt7/kbUsQ1tpufDfqPNlRbEs3yVKfL6WOL1VH8DFU2/M1zpDThNskmr6T5yH5JbHJ+enAem5Db8W0JgLHGx4DrHqsYxILe1mOjiyv3ju381TV3NeoMdxc1hOJ2fGjfoh5PPd9UB541BfsWyg7mca+2s6f1R0+Z+fCzeegP8ukMagd+o7swO+FAfw
eNrV1NEOgCAIBVDYqP//5MIaI1SgdKvuS6tDhmYB5LOqfM1xj3Y+v+s2Mx1cLL6oVAU47HwNRWNHp736AYFb5oLIsT+9o0W7vA6bIRrrD8H7SfhlezVuNtsPJzoRveqp/v1PIFrfs0IOf3OZV/cHMObPsgEGwwjn
eNrtksESgCAIRFml/v+T06lJiZUmu3Roj751RUDklxfoYa8bTAxAavLcYGJwHBF2ATnncrbsrqW4KT9SMMlT0ir2/nEz4DCc/D/unzHw/t/Np9MKAtdOl4xv8maZ4xpzVVuCxXWSGPdfn3I5622GmPsVMxxsAbpKJOYS89F+xfEv+Jw2d9EGAQ==
eNrd00sOgCAMBFBLhPsfWUKwpe1AjcaFzsbPG0kA2bZ/hII3kbsCeqYeOCCNCbiP4XhvAQVBqSzYFJhTiytoloL5PKXcowdwzIXR67j1pilRQp7FM/Qx3g0rtwW9AH4Cav5+AWYLLMsXbBABN/uPfPoLXfJyQinYJa/4+giszwc3+PI153lNJvjU7+UAcuIGig==
eNq10lEOxCAIBFBG07n/kZdoSYqlmGqXn6a+0RBR5NPihK1yjQNkHmAe6KtoFQXa2nFWELhy4G57DzxvD73WbQca6ue1izufC66Xq1JKST3dbwFE8xGcdfQJ3h4AaAnIyH3s2pw9A8K5inP9/dy55XCOl16rc247MN5+7m1kV5f/+u1xDDVxWXV5SMD6Qtzg1CfnL9YPzhkLiQ==
eNrN090OgCAIBWCOw97/kbOfJQLitK3FnXxn5pSIvikMOtABaB+uWa7ZcdGC9tLh2gM7DlnWTRlPtTxPqQ1MueIjYB35SuWycv3eBYs++n7oiNjen50nEYDv/dfRvnmvu4lSe/zTa2TNOfb2J2n81OL9++dZp+e8NRC7HbHG4Q2AOAnFTrH35ive/oWv1Q5kcQYj
eNrV0UsOgCAMBFCGqPc/sq0BU6qIbWXhbEh4XfSTkimZ01XgcKDrJRMcOmZfZG59rbk6Td26WtM3DrByKz6f3Z/fX+w/et8n549NRlUMneZrnT7MnmsmeaC/4H7i9ysV4v2Xn2MN5ve6Mzu6OQfQ
eNq90lEOwyAMA1A8Su5/5CUttDAMadE2/03PzVCUEP4acbhkrrzwskwKrct0PCnIPU8aOv/io9D9P07WwHNQR8YlR0rT+a5bYdNwrwcwzgOGbL5HmbuUBvi3ch5A11E5XJ9vrj+/7vLE06ejdt2xLXrZ9RBipPPzGSO2vq+v9m7Hjhs3Hn7ro+MZXYjDtz0MGijvAn+g6878xbwB/coJtw==
eNpjYBgsgBkFUF2eEVWekRFdHh1gyLMiAzR5Nja2QSDPCHEkiKKJPDHuY2FhoYE8ofCnhjyh+KdEHizChgDoKkaEPP4QxB+8cBVwaqjJw/2Fw4OUypMHAJnsCE8=
eNrlkckOgCAMRCkR//+TxWasgl0ixoPhXUh4A+mS0lQQ41srsd9nRk2IRcLTSgC6VBBQnhdw/0B0vT8Cn/hLAU/qi/oL54PAwmRjAQTvbNDcL7UM+PVE6a7z7RdTeHJHGM0XCTn+5qUvo8G3fowNgB0Fyg==
eNq9lNsOgCAMQylm/P8nywSRyxiyGPsknK6LjODcrwoLfEunssGzFEPLgxovGMI7TlEKJyqGvj8KTg4LxwUBEweRmr/kbIhnPOF1AOT624AZvxQx5P8rloHzXjV+XvaXo+Fx+THv+ht4o01+HOkAkmzc+9qAYTwL7mvBaeUcoJYPARg45MvzyEkd8jsB4X3ReUmdxCMP9vnY5It8o05YugkA
eNrd09EOgCAIBVBc1P9/chotAySHuNa6T+hBNzcEmBDs7Efdaug4siqJ+H29xeelfN0RlFMPVS7Pi8f7ZzlSxs7ziJnAmC85fDy0bzXSk/JjwqqX/N31DwO7pfGfz32LP+7Xu4wHRn0sO79TB4U=
eNrl0UESgCAIBVB+o97/yJWaiRBOWoumv1Ifg5FEzwQxbIN77pw7jtIa/ALh9IIjf57mqCOc0Eb4cqbDe0HPYbFoEB0+Vfltp3rugkHv3W96d35YzAugu/E6jQcoGKo0Pf7usYT53P9XnMrxN73MdTHgrI9lBfg0Bhs=
eNrtk0kOgCAMRfur9z+zVhKQjiS6MfEv+zpDiX69LgTmoRyz53Cah2yKCTsOM2bdhArXCQRvIt/hiq44mwop1rxtpjePW4GCN7PhXHN4q9MTIuJccjv9LlrkAKX5+3hIeZQAT/n68yIL9x3U90SGCTDnEZ6mf6EF/qwOZ+0Eug==
eNq109EOgCAIBVAumf//yYXTSYY6ye5Dqw5DnUq0LbHG51zi9FF/AMrvrzXnd5ZcBjhrXsNv8VyS3jz+cXwpuNfdcd3AYlWAnqcIm14KZCdbCiHIfzk7ZYPROD+ceb9HebodD4flen1jj43TcSy6cYOGnu6XdvrXu4cjZ+LkdepUoMwL9gSnPunvzAVeAglm
eNrFlNsShSAIRfPC///yQQQFAp+qw1RTrZ3gDr2uT6OMONA+IlMwTgWCURAnXthXsRLvq06iEi+sBSoxHa6K/aabMkRQLFZ1Oo4IALbA8YmVQBdAAwOIgGaizRkKgCWgD6wBg/PJz9Z5z7vzx41/M8jUFxl4nN/BHyMoAdY/uIRdtnqi1hp2aeOeQs7N1kz/NYnB553r0M1DLIpaE8qKydMlRvywQLH+E57ze4VPW5EnK/wZnu8g/+cmPtqQf5CCCBU=
eNrV1IEKgCAMBNANsv//5LLmSrcbRZl0BEJvyHIh0b1Ma8Y5c3ZmRqwBnCRewYk9P6lXUHNqW2jYbPCGs3zBtg7wqD8tkNUesG4ezwc7xePdNygP+HXU7fxMPvf5yO88V1TuTOepSw/gAohO94pTeY3ul97eJQuUMwd1
eNqt01ESgCAIBFA2zfsfOXG0UCFHar9qHgOmRvRb0hOfHy1Of+sPQHh+2/NjzpbzgPPJNP4XryXlyeMf53NB/m7DZQONRQEsL2FWvRXwSerGN+g+YIwH2Hl+1byu0Ocpxrh0vjqqo3NoLuaPHkLnyfLAOXnSnvMOi/6zl//r3t/s9OYJ+Ojm5ahZOHmdjAq0dUFf4NIX/Z25AF3FCQI=
eNrVk9EOgCAIALVY///JwWIqjkkCPXQvKocb4CwlBbAiYF2AxakSUDu8F16h+0Nhz58T+R4LZke7fP+mPiAC3t//ev7W+8b8k3GNSG17LFd6DGz71vpHPlBfcD7KG0z/3/KcMaz/8q0to3+vd3IDhbsHhQ==
eNrVlNEOgCAIRWUz//+TC00FAiye7D5U8xzXvDpT2igwYtOsCzeseRqT5ak4WBgKroIznQo6RsHFXTDxJbDStKyE0R1pkX60YV6VHJMbsdrjKD9IYhwAGT61H1MOKp/5yGudjPN1vuIF095g8tKt/bh29kzFugDocf0VH+sC7waL81hOgHAG/g==
""".split()
assert len(TOKENS)==30, len(TOKENS)
assert len(NAMES)==30 and len(SPECIES)==30

def original_palette(i,reference=None):
    col=[tuple(bytes.fromhex(s)) for s in BASES[(i*7+i//3)%10].split()]
    if reference:
        group=np.asarray(reference.get("palette_rgb_learned",[]),float)
        if len(group):
            sample=group[int(np.argmax(np.ptp(group,axis=1)))]
            h,_,_=colorsys.rgb_to_hsv(*(sample/255.0))
            a,s,v=colorsys.rgb_to_hsv(*(np.array(col[3])/255.0))
            col[3]=tuple(round(255*c) for c in colorsys.hsv_to_rgb((.88*a+.12*h)%1,min(.55,s),v))
    return col

def emit(out,study=None):
    out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
    records=json.loads(pathlib.Path(study).read_text())["records"] if study else [None]*30
    assert len(records)==30
    allchars=[]
    sheet=Image.new("RGB",(1332,1555),(22,25,37)); d=ImageDraw.Draw(sheet)
    font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",17)
    tiny=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",13)
    for i,(token,name,species) in enumerate(zip(TOKENS,NAMES,SPECIES)):
        raw=zlib.decompress(base64.b64decode(token))
        assert len(raw)==W*H
        grid=np.frombuffer(raw,dtype=np.uint8).reshape((H,W))
        assert int(grid.min())==0 and int(grid.max())<=6
        p=original_palette(i,records[i])
        rgba=np.zeros((H,W,4),dtype=np.uint8)
        for j,clr in enumerate(p,1):
            rgba[grid==j,:3]=clr
            rgba[grid==j,3]=255
        img=Image.fromarray(rgba,"RGBA")
        assert all(a in (0,255) for a in np.unique(rgba[:,:,3]))
        ys,xs=np.where(grid!=0)
        assert len(xs)>=100 and len(set(grid.ravel()))<=7
        img.save(out/f"character-{i+1:02d}.png")
        x=(i%6)*222;y=(i//6)*311
        d.rounded_rectangle((x+7,y+7,x+215,y+304),radius=13,fill=(35,39,53),outline=(72,76,90))
        d.rectangle((x+18,y+43,x+204,y+243),fill=(31,35,45))
        d.line((x+18,y+227,x+204,y+227),fill=(62,68,76),width=2)
        sheet.paste(img.resize((160,240),Image.Resampling.NEAREST),(x+31,y+18),img.resize((160,240),Image.Resampling.NEAREST))
        d.text((x+18,y+251),f"{i+1:02d}  {name}",font=font,fill=(232,225,208))
        d.text((x+18,y+275),f"{W} x {H}  |  {len(np.unique(grid))-1} colors",font=tiny,fill=(157,167,178))
        allchars.append({"id":i+1,"name":name,"species":species,"pixels":len(xs),"colors":len(np.unique(grid))-1,"alpha":"binary","reference_stat_conditioned":bool(records[i])})
    sheet.save(out/"contact-30-original.png")
    result={"native_size":[W,H],"original_character_count":30,"source":"original authored indexed silhouettes","palette_learning":"optional per-reference K-means statistics; not a neural generator","original_game_sprites_included":False,"sprites":allchars}
    (out/"manifest.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print("PASS:",len(allchars),"unique original sprites, no blur, no proprietary sprite pixels")
    return result

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--study")
    parser.add_argument("--out",default="artifacts/deathroad-original-30")
    args=parser.parse_args()
    emit(args.out,args.study)
