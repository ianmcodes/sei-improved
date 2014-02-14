A Wrapper Around se-interpreter
===============================

`npm install -g sei-improved`

The configuration file for this is almost exactly the same as for se-interpreter. In fact, it will run se-interpreter configs with un-modified. 

However things get interesting when you get to the "overrides" section.

Anotated Example config:

```JSON
{
  "type": "interpreter-config",
  "configurations": [
    {
      "settings": [
        {
          "driverOptions": {
            "protocol": "http",
            "host": "hub.browserstack.com",
            "port": "80",
            "path": "/wd/hub"
          },
          "browserOptions":  {
            "browserstack.user": "",
            "browserstack.key": "",
            "browserstack.debug": true,
            "browserstack.tunnel": true
          }
        }
      ],
      "scripts": [
        {
          "overrides": [
            {
              "type": "get", /* This is the type of step in the selenium builder test */
              "key": "url", /* This is what to override in the step */
              /* if the value matches "from", replace with "to" */
              "from": "http://staging.example.com/test/",
              "to": "http://dev.example.com/seleniumtests/"
            },
            {
              "type": "get",
              "key": "url",
              "from": "http://staging.example.com/test/alt.html",
              "to": "http://dev.example.com/seleniumtests/alt.html"
            }
          ],
          "scripts": [
            "Test_Set_1/*",
            "Test_Set_2/*"
          ]
        }
      ]
    }
  ]
}
```
