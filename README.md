# framework

Пакет предоставляет модульную систему для прототипирования и создания приложений. Данная система не похожа на другие
AMD системы, такие как RequireJS или CommonJS. Правильнее будет сказать, что данная система основана на CommonJS NodeJS.

### Краткое описание и пример работы

Система позволяет в более удобном и наглядном виде написать приложение сразу же разбивая его на отдельные модули. И всё
это можно сделать в одном файле. Вот пример:

    // ./config.js
    
    module.exports = {
      name: 'корневой модуль (основное приложеное)', // данное свойство не обязательно
      
      // конструктор, будет вызван когда все зависимые модули будут готовы к работе
      initialize() {
        // метод log, мы не объявляли он был взят из подмодуля
        this.log('Я загрузился');
      },
      
      modules: [
        {
          // опция __basename описывает, как этот модуль нужно включить в родительский модуль
          // в данном случае в родительский модуль включается функция output в свойство log.
          // функция будет привязана к контексту этого модуля
          __basename: {
            log: 'output'
          },
          output(message) {
            console.log(`[${new Date()}] ${message}`);
          }
        }
      ]
    };

Результатом выполнения в терминале (при условии что cwd указывает на корневую директорию пакета)

    NODE_PATH=$(pwd) node ./index.js ./config.js

будет строка

    [Fri Sep 01 2017 20:18:44 GMT+0500 (+05)] Я загрузился

Теперь о том, что мы сейчас сделали, по порядку

1. Создали файл конфигурации прототипа приложения `./config.js`
1. Экспортируемый объект в файле описывает корневой модуль
1. Он содержит в себе свойство `modules` в котором описан его подмодуль
1. Этот подмодуль реализует часть функционала, которой пользуется корневой модуль в своём конструкторе

Допустим, что описанный выше прототип и есть наше законченное приложение. В этом случае его нужно будет разнести по
отдельным файлам. Например так:

    // modules/log.js
    
    const Module = require('framework/module');
    
    class Log extends Module {
      output(message) {
        console.log(`[${new Date()}] ${message}`);
      }
    }
    
    // конфигурация по умолчанию: тот, кто подключит этот модуль и не переопределит описанное здесь стандартное свойство
    // __basename, тот получит в свой модуль свойство log, в котором будет функция output
    Log.defaults = {
      __basename: {
        log: 'output'
      }
    };
    
    module.exports = Log;

и главный модуль

    // modules/main.js
    
    const Module = require('framework/module');
    
    class Main extends Module {
      initialize() {
        this.log('Я загрузился');
      }
    }
    
    // раз уж этот модуль зависит от Log, пропишем его в зависимостях по умолчанию. Но при запуске это можно будет
    // переопределить на более подходящий подмодуль с аналогичным интерфейсом
    Main.defaults = {
      modules: [{
        __filename: 'modules/log'
      }]
    };
    
    module.exports = Main;

Тем не менее конфигурация всё равно потребуется

    // config/default.js
    
    module.exports = {
      __filename: 'modules/main'
    };

Теперь запускаем

    NODE_PATH=$(pwd) node ./index.js config/default

И снова обо всём по порядку

1. Был определён файл конфигурации приложения
1. В этом файле указано, что корневой модуль нужно загрузить из файла `modules/main`
1. Больше никаких опций в конфигурации не указано, значит модуль будет загружен со стандартными опциями, указанными в
`Main.defaults = {...`
1. В стандартных опциях этого модуля указано, что необходимо загрузить ещё и `modules/log` и тут тоже никаких опций не
определёно, так что и подмодуль тоже будет загружен со стандартными опциями.
1. После того как подмодуль будет загружен, будет вызван конструктор в корневом модуле

Таким образом, мы сначала создали полнстью рабочий прототип приложения в одном файле, а потом разнесли его по отдельным
файлам-модулям. В этом и заключается преимущество данной модульной системы. Пока в начале не понятно на какие модули
нужно разбить приложение, всё пишется в отдельном файле (с формальной разбивкой по модулям-объектам). После того, как
приложение доведено до рабочего состояния и есть понимание его архитектуры, объекты-модули можно разнести по
файлам-модулям.

### Более подробно

Для того, что бы понять как устроена модульная система нужно разобраться с алгоритмом загрузки одного модуля. Для того,
что бы модуль быть загружен, нужно понимать откуда его нужно загрузить. Каждый модуль может быть определён в

1. файле;
1. скопе;
1. самой конфигурации.

Если модуль определён в файле, значит в его конфигурации должно быть определено свойство `__filename`. Если модуль уже
был загружен и он находится в общем скопе, должно быть определено свойство конфигурации `__inject`, которое укажет на
требуемый модуль в скопе. Если нет ни того ни другого, будет создан "чистый" модуль с тем, что определено в его
конфигурации.

Как только экземпляр модуля был создан из класса, объявленного в файле, или взят из скопа, или был создан из самой
конфигурации, нужно таким же образом последовательно загрузить его подмодули объявленные в `modules`. Это свойство
конфигурации является массивом конфигураций подмодулей.

После того, как все подмодули были последовательно (с учётом возможности асинхронной работы конструктора каждого
подмодуля) загружены, вызывается конструктор осноговного модуля. Как было сказано выше, конструктор может первнуть
объект `Promise`. И это будет означать, что нужно дождаться выполнения (`resolve`) этого объекта и только после этого
продолжить.

Если, конструктор модуля __не__ вернул обещание или оно было выполнено, будет произведена проверка на необходимость
добавить данный модуль в скоп. То есть на наличии в конфигурации данного модуля свойства `__define`. Если это свойство
определено и, в качестве значения, содержит уникальное, в рамках всего скопа, название, то экземпляр этого модуля будет
добавлен в скоп, для того, что бы позже его можно было включить в другой модуль при помощи свойства конфигурации
`__inject`, которое, в свою очередь, должно содержать название требуемого модуля.

#### Определение модуля в файле

Для того что бы определить модуль в файле, нужно

1. Подключить файл framework-модуля `framework/module`;
1. Создать класс и наследовать его от подключенного framework-модуля;
1. Экспортировать созданный класс

Допустим, что пакет `framework` подключен к текущему пакету при помощи вызова `npm install framework`. Тогда объявление
пользовательского модуля в файле будет выглядеть так

    // подключение framework-модуля
    const Module = require('framework/module');
    
    // объявление класса-модуля, наследуемого от framework-модуля
    class MyModule extends Module {
      initialize() {
        console.log('Пользовательский модуль был загружен');
      }
    }
    
    // экпорт клсса-модуля
    module.exports = MyModule;

Теперь этот модуль можно загрузить в конфигурации

    module.exports = {
      __filename: 'modules/mymodule'
    };

#### Объявление модуля в скопе

Хотя правильнее будет сказать не объявление, и пользование модуля из скопа (ранее туда объявленного). На самом деле
модуль будет объявлен в конфигурации. Вот пример файла `config/default.js`

    module.exports = {
      
      modules: [
        /* объявление других модулей (в том числе и в скопе) */
        
        {
          __inject: 'MyModule',
          __basename: 'my' // опция __basename обязательна, если модуль загружается из скопа
        }
      ]
      
    };

#### Опции конфигурации

Для определения или загрузки модуля, есть специальные опции которые управляют этим процессом. Они уже не раз были
показан. Теперь подробнее о каждой из них:

**__basename** - определяет то, каким образом нужно включить определяемый модуль в родтельский объект-модуль.

**__filename** - определяет расположение файла-модуля.

**__define** - если указано, модуль будет добавлен в скоп с указанным именем.

**__inject** - если указано, экземпляр модуля будет взят из скопа.

**modules** - определяет конфигурации подмодулей

Все эти опции не обязательные. Возможны следующие варианты конфигурирования модуля этими опциями

1. Только `__basename`

В этом случае будет создан "чистый" модуль, который будет являться экземпляром framework-модуля и будет содержать только
сконфигурированные свойства. Благодаря опции `__basename` у родительского модуля будет ссылка на этот экземпляр.
Определять эту опцию у корневого модуля безсмысленно, данная опция просто будет одним из его свойств.

2. Только `__filename`

Модуль будет загружен из файла. Но без опции `__basename` ссылки на него нигде не будет.

3. Только `__define`

Как и в случае №1, будет создан "чистый" модуль и он будет добавлен в скоп.

4. Только `__inject`

Данный случай безсмысленный, т.к. требуемый модуль и без того уже был загружен. А без указания `__basename`, получить
доступ к указанному экземпляру модуля будет не возможно. При это будет ошибка и работа приложения будет прекращена.

5. Только `__filename`, `__basename` и `__define`

Модуль будет загружен из файла, экземпляр будет размещён в родительском модуле и так же будет добавлен в скоп.

6. Только `__inject` и `__basename`

В отличии от случая №4 экземпляр модуля будет загружен из скопа и объявлен в родительском модуле в свойстве с именем
указанным в опции `__basename`. Разумеется определять опцию `__inject` у корневого модуля бызсмысленно и это приведёт к
ошибке. Т.к. корневой модуль загружается первым и никаких модулей в скопе ещё не может быть объявлено.

7. Только `__inject` и `__filename`

В этом случае приоритет будет у `__inject` и если указанного модуля не будет в скопе - будет ошибка.

8. Только `__inject`, `__basename` и `__define`

Модуль будет загружен из скопа, добавлен родительскому модулю в свойство имя которого указано в `__basename` и так же
модуль будет ещё раз добавлен в скоп.

#### __basename

Есть несколько способов объявить подмодуль в родительском модуле.

1. Если значением опции является строка, будет произведена попытка добавить подмодуль в родительский модуль в указанное
свойство. Если это свойство у родительского модуля уже определено, будет ошибка. При этом не важно, каким значением
будет определено это свойство будь то `null` или `undefined`. Вожно только лишь его наличие.

1. Если значением опции является объект, то имя каждого свойства этого объекта будет определять имя свойства
родительского модуля в которое будет помещено, то что указано в значении этого свойства. А в значении может быть указано
имя свойства/метода подмодуля либо функция, которая первым агрументом примет экземпляр модуля и вернёт нужно значение
значение.

Что касается первого случая, когда опция `__basename` определена строкой, то тут всё просто и понятно. А вот с объектом
нужна пара примеров. Кстати, один пример был приведён в самом начале. Когда к корневому модулю подключали подмодуль Log.
Этот подмодуль имел метод `output`, который был включён в родительский модуль под именем `log`, вот таким образом

    ...
    __basename: {
      log: 'output'
    }
    ...

Так вот в место `'output'` может быть не только любая другая строка, но и функция. Вот пример

    {
      initialize() {
        // попытка записать что-то в коллекцию, но откуда она должна взяться?
        this.collection.insertOne({ text: 'Some text...' });
      },
      
      modules: [{
        __inject: 'db',
        __basename: {
          // имя функции "collection" - определяет свойство в родительском модуле,
          // а значение вернёт функция
          collection(instance) { return instance.collection('НАЗВАНИЕ_КОЛЛЕКЦИИ'); }
        }
      }]
    }

В этом случае в функцию в первом аргументе был передан экземпляр требуемого модуля `db`.


