# knee

Пакет предоставляет высокоуровневую модульную систему для прототипирования и создания приложений.

### Краткое описание и пример работы

Система позволяет в удобном и наглядном виде написать приложение сразу же разбивая его на отдельные модули. И всё
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
    
    const Module = require('knee/module');
    
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
    
    const Module = require('knee/module');
    
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
файлам-модулям. В этом и заключается преимущество данной модульной системы: на начальном этапе разработки не понятно на
какие модули нужно разбить приложение и всё пишется в отдельном файле (с формальной разбивкой по модулям-объектам).
После того, как приложение доведено до рабочего состояния и есть понимание его архитектуры, объекты-модули можно
разнести по файлам-модулям.

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
конфигурации, нужно таким же образом последовательно создать все его подмодули объявленные в `modules`. Это свойство
конфигурации является массивом конфигураций других модулей.

После того, как все подмодули были последовательно (с учётом возможности асинхронной работы конструктора каждого
подмодуля) загружены, вызывается конструктор осноговного модуля. Как уже было сказано, конструктор может вернуть объект
`Promise`. И это будет означать, что нужно дождаться выполнения (`resolve`) этого обещания и только после этого
продолжить.

Если, конструктор модуля __не__ вернул обещание или оно было выполнено, будет произведена проверка на необходимость
добавить данный модуль в скоп. То есть на наличии в конфигурации данного модуля свойства `__define`. Если это свойство
определено и, в качестве значения, содержит уникальное, в рамках всего скопа, название, то экземпляр этого модуля будет
добавлен в скоп, для того, что бы позже его можно было включить в другой модуль при помощи свойства конфигурации
`__inject`, которое, в свою очередь, должно содержать название требуемого модуля.

#### Определение модуля в файле

Для того что бы определить модуль в файле, нужно

1. Подключить файл knee-модуля `knee/module`;
1. Создать класс и наследовать его от подключенного knee-модуля;
1. Экспортировать созданный класс

Допустим, что пакет `knee` подключен к текущему пакету при помощи вызова `npm install knee`. Тогда объявление
пользовательского модуля в файле будет выглядеть так

    // подключение knee-модуля
    const Module = require('knee/module');
    
    // объявление класса-модуля, наследуемого от knee-модуля
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

Хотя правильнее будет сказать не объявление, использование модуля из скопа (ранее туда добавленного). На самом деле
модуль будет объявлен в конфигурации. Вот пример файла `config/default.js`

    module.exports = {
    
      modules: [
        { // объявление какого-то модуля
          __define: 'MyModule', // добавляем его в скоп
          bar: 'foo' // это просто какое-то свойство характеризующее модуль
        },
    
        { // а это уже не определение модуля, а ссылка на существующий модуль
          __inject: 'MyModule',
          __basename: 'my' // опция __basename обязательна, если модуль загружается из скопа
          // определять какие либо пользовательский свойства безсмысленно и они будут проигнорированы
        }
      ]
    
    };

#### Опции конфигурации

Для определения или загрузки модуля, есть специальные опции которые управляют этим процессом. Они уже не раз были
показаны. Теперь подробнее о каждой из них:

**__basename** - определяет то, каким образом нужно включить определяемый модуль в родтельский объект-модуль.

**__filename** - определяет расположение файла-модуля.

**__define** - если указано, модуль будет добавлен в скоп с указанным именем.

**__inject** - если указано, экземпляр модуля будет взят из скопа.

**modules** - определяет конфигурации подмодулей

Все эти опции не обязательные. Возможны следующие варианты конфигурирования модуля этими опциями

1. Только `__basename`

В этом случае будет создан "чистый" модуль, который будет являться экземпляром knee-модуля и будет содержать только
сконфигурированные свойства. Благодаря опции `__basename` у родительского модуля будет ссылка на этот экземпляр.
Определять эту опцию у корневого модуля безсмысленно, данная опция просто будет одним из его свойств.

2. Только `__filename`

Модуль будет загружен из файла. Но без опции `__basename` ссылки на него нигде не будет.

3. Только `__define`

Как и в случае №1, будет создан "чистый" модуль и он будет добавлен в скоп.

4. Только `__inject`

Данный случай безсмысленный, т.к. требуемый модуль и без того уже был загружен. А без указания `__basename`, получить
доступ к указанному экземпляру модуля будет не возможно. При этом будет ошибка и работа приложения будет прекращена.

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
имя свойства/метода подмодуля либо функция, которая первым агрументом примет экземпляр модуля и вернёт нужное значение
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

#### Запуск приложения

Для того что бы запустить какое бы то ни было приложение, всегда нужен тот или иной файл конфигурации. В самом простом
виде запуск приложения будет выглядеть так

    /path/to/knee/index.js /path/to/config/file.js

То есть файлу knee пакета index.js нужно передать в качестве первого аргумента файл конфигурации.

Для того что бы можно было удобно подключать модули, как было показано в примерах нужно определить переменную окружения
NODE_PATH. Например так

    NODE_PATH=/path/to/knee node /path/to/knee/index.js /path/to/config/file.js

#### Примеры простых приложений

Самый простой способ напечатать в консоли "Привет мир!", это создать следующий файл конфигурации

    module.exports = {
      initialize() {
        console.log('Привет мир!');
      }
    };

Можно сделать тоже самое, но определив модуль в отдельном файле

    // modules/hello.js
    
    const Module = require('knee/module');
    
    class Hello extends Module {
      initialize() {
        console.log('Привет мир!');
      }
    }

но и файл конфигурации тоже нужен

    module.exports = {
      __filename: 'module/hello'
    };

А можно сделать более изящно. Создадим модуль, который будет печатать то, что нужно.

    // modules/printer.js
    
    const Module = require('knee/module');
    
    class Printer extends Module {
      initialize() {
        console.log(this.message);
      }
    }
    
    Printer.defaults = {
      message: 'Текст для вывода не был определён'
    };
    
    module.exports = Printer;

А в конфигурации укажем сам текст

    module.exports = {
      __filename: 'modules/printer',
      message: 'Мы строили, строили и наконец построили! Урааа!'
    };

