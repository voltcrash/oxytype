### **Table of Contents**

- [Forking Oxytype](#forking-oxytype)
- [Creating Quotes](#creating-quotes)
- [Committing Quotes](#committing-quotes)
- [Quote Guidelines](#quote-guidelines)

### Forking Oxytype

First you will have to copy the Oxytype repository also known as forking. Go to the [Oxytype Repo](https://github.com/voltcrash/oxytype/) and then click the "fork" button.


## Creating Quotes

After you forked the Oxytype repository you can now add your quotes. (If you haven't already forked the repository, refer to this [section](#forking-oxytype).) (Before continuing to the next step make sure the quote's language exists in Oxytype) Add this code in at the end of the quotes `./frontend/static/quotes/[language].json`:

```json
{
    "text": "[quote]",
    "source": "[source]",
    "id": [number of the quote],
    "length": [number of characters in quote]
}
```

If the language does exist in Oxytype, but there are no quotes for it create a new file for the language.

### Committing Quotes

Once you have added your quote(s), you now need to create a pull request to the main Oxytype repository. Go to the branch where you added your quotes on GitHub. Then make sure your branch is up to date. Once it is up to date, click "contribute".

Update branch:

Create a pull request:

## Quote Guidelines

Make sure your quote(s) follows the [Quote guidelines](./CONTRIBUTING.md#quote-guidelines).
