### **Table of Contents**

- [Forking Oxytype](#forking-oxytype)
- [Adding fonts](#adding-fonts)
- [Committing Languages](#committing-languages)
- [Language Guidelines](#language-guidelines)

### Forking Oxytype

First, you will have to make a personal copy of the Oxytype repository, also known as "forking". Go to the [Oxytype repo](https://github.com/voltcrash/oxytype/) and then click the "fork" button.


## Adding Fonts

Once you have forked the repository you can now add your font. Place the font file in `./frontend/static/webfonts` e.g. `My-Font.woff2`.

> [!NOTE]
> Your font needs to be in the `.woff2` format. Your filename cannot include spaces or start with a number.

Open `./packages/schemas/src/fonts.ts` and add the new font at the _end_ of the `KnownFontNameSchema` list like this:

```typescript
const KnownFontNameSchema = z.enum(
  [
    "Roboto_Mono",
    "Noto_Naskh_Arabic",
    ...
    "My_Font",
```

Call it whatever you want but make sure you replace spaces with underscores and the font does not start with a number.

Then, go to `./frontend/src/ts/constants/fonts.ts` and add the following code to the _end_ of the `Fonts` object near to the very end of the file:

```typescript
export const Fonts: Record<KnownFontName, FontConfig> = {
  ...
  My_Font: {
    fileName:  "My-Font.woff2",
  }
```

### Committing Languages

Once you have created your language, you now need to create a pull request to the main Oxytype repository. Go to the branch where you created your languages on GitHub. Then make sure your branch is up to date. Once it is up to date, click "contribute".

Update branch:

Create a pull request:

## Language Guidelines

Make sure your language follows the [Language guidelines](./CONTRIBUTING.md#language-guidelines).
