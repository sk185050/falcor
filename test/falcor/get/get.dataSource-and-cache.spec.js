var falcor = require("./../../../lib/");
var Model = falcor.Model;
var Rx = require('rx');
var noOp = function() {};
var LocalDataSource = require('../../data/LocalDataSource');
var Observable = Rx.Observable;
var strip = require('./../../cleanData').stripDerefAndVersionKeys;
var cacheGenerator = require('./../../CacheGenerator');
var jsonGraph = require('falcor-json-graph');
var toObservable = require('../../toObs');

var M = function(m) {
    return cacheGenerator(0, 1);
};
var Cache = function(c) {
    return cacheGenerator(0, 40);
};

describe('DataSource and Partial Cache', function() {
    it('should onNext only once even if a subset of the requested values is found in the cache', function(done) {
        var model = new Model({
            cache: {
                paths: {
                    0: 'test',
                    1: 'test'
                }
            },
            source: new LocalDataSource({
                paths: {
                    2: Model.atom('test'),
                    3: Model.atom(undefined)
                }
            }, {materialize: true})
        });

        var onNextCount = 0;
        toObservable(model.
            get(['paths', {to:3}])).
            doAction(function(value) {

                onNextCount++;

                if (onNextCount === 1){
                    expect(strip(value)).toEqual({
                        json: {
                            paths: {
                                0: 'test',
                                1: 'test',
                                2: 'test'
                            }
                        }
                    });
                }
            }).subscribe(noOp, done, function(){
                expect(onNextCount).toBe(1);
                done();
            });
    });

    describe('Preload Functions', function() {
        it('should get multiple arguments with multiple selector function args.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            var secondOnNext = jest.fn();
            toObservable(model.
                preload(['videos', 0, 'title'], ['videos', 1, 'title'])).
                doAction(onNext, noOp, function() {
                    expect(onNext).not.toHaveBeenCalled();
                }).
                defaultIfEmpty({}).
                flatMap(function() {
                    return model.get(['videos', 0, 'title'], ['videos', 1, 'title']);
                }).
                doAction(secondOnNext, noOp, function() {
                    expect(secondOnNext).toHaveBeenCalledTimes(1);
                    expect(strip(secondOnNext.mock.calls[0][0])).toEqual({
                        json: {
                            videos: {
                                0: {
                                    title: 'Video 0'
                                },
                                1: {
                                    title: 'Video 1'
                                }
                            }
                        }
                    });
                }).
                subscribe(noOp, done, done);
        });

        it('should get a complex argument into a single arg.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            var secondOnNext = jest.fn();
            toObservable(model.
                preload(['lolomo', 0, {to: 1}, 'item', 'title'])).
                doAction(onNext).
                doAction(noOp, noOp, function() {
                    expect(onNext).not.toHaveBeenCalled();
                }).
                defaultIfEmpty({}).
                flatMap(function() {
                    return model.get(['lolomo', 0, {to: 1}, 'item', 'title']);
                }).
                doAction(secondOnNext, noOp, function() {
                    expect(secondOnNext).toHaveBeenCalledTimes(1);
                    expect(strip(secondOnNext.mock.calls[0][0])).toEqual({
                        json: {
                            lolomo: {
                                0: {
                                    0: {
                                        item: {
                                            title: 'Video 0'
                                        }
                                    },
                                    1: {
                                        item: {
                                            title: 'Video 1'
                                        }
                                    }
                                }
                            }
                        }
                    });
                }).
                subscribe(noOp, done, done);
        });
    });
    describe('PathMap', function() {
        it('should ensure empty paths do not cause dataSource requests {from:1, to:0}', function(done) {
            var onGet = jest.fn();
            var model = new Model({
                cache: { b: {} },
                source: new LocalDataSource({}, { onGet: onGet })
            });

            var modelGet = model.get(['b', { from: 1, to: 0 }, 'leaf']);
            var onNext = jest.fn();
            toObservable(modelGet).
                doAction(onNext, noOp, function() {
                    expect(onGet).not.toHaveBeenCalled();
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: { b: {} }
                    });
                }).
                subscribe(noOp, done, done);
        });
        it('should ensure empty paths do not cause dataSource requests [].', function(done) {
            var onGet = jest.fn();
            var model = new Model({
                cache: { b: {} },
                source: new LocalDataSource({}, { onGet: onGet })
            });

            var modelGet = model.get(['b', [], 'leaf']);
            var onNext = jest.fn();
            toObservable(modelGet).
                doAction(onNext, noOp, function() {
                    expect(onGet).not.toHaveBeenCalled();
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: { b: {} }
                    });
                }).
                subscribe(noOp, done, done);
        });

        it('should get multiple arguments into a single toJSON response.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            toObservable(model.
                get(['lolomo', 0, 0, 'item', 'title'], ['lolomo', 0, 1, 'item', 'title'])).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: {
                            lolomo: {
                                0: {
                                    0: {
                                        item: {
                                            title: 'Video 0'
                                        }
                                    },
                                    1: {
                                        item: {
                                            title: 'Video 1'
                                        }
                                    }
                                }
                            }
                        }
                    });
                }).
                subscribe(noOp, done, done);
        });

        it('should get a complex argument into a single arg.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            toObservable(model.
                get(['lolomo', 0, {to: 1}, 'item', 'title'])).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: {
                            lolomo: {
                                0: {
                                    0: {
                                        item: {
                                            title: 'Video 0'
                                        }
                                    },
                                    1: {
                                        item: {
                                            title: 'Video 1'
                                        }
                                    }
                                }
                            }
                        }
                    });
                }).
                subscribe(noOp, done, done);
        });

        it('should get a complex argument into a single arg and collect to max cache size.', function(done) {
            var model = new Model({
                cache: M(),
                source: new LocalDataSource(Cache()),
                maxSize: 0
            });
            var cache = model._root.cache;
            var onNext = jest.fn();
            toObservable(model.
                get(['lolomo', 0, {to: 1}, 'item', 'title'])).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: {
                            lolomo: {
                                0: {
                                    0: {
                                        item: {
                                            title: 'Video 0'
                                        }
                                    },
                                    1: {
                                        item: {
                                            title: 'Video 1'
                                        }
                                    }
                                }
                            }
                        }
                    });
                }).
                finally(function() {
                    expect(cache['$size']).toBe(0);
                    done();
                }).
                subscribe(noOp, done, noOp);
        });

        it('should ensure that a response where only materialized atoms come ' +
           'through still onNexts a value if one is present in cache.', function(done) {
            var model = new Model({
                cache: {
                    paths: {
                        0: 'test',
                        1: 'test'
                    }
                },
                source: new LocalDataSource({
                    paths: {
                        2: Model.atom(undefined),
                        3: Model.atom(undefined)
                    }
                }, {materialize: true})
            });

            var onNext = jest.fn();
            toObservable(model.
                get(['paths', {to:3}])).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    expect(strip(onNext.mock.calls[0][0])).toEqual({
                        json: {
                            paths: {
                                0: 'test',
                                1: 'test'
                            }
                        }
                    });
                }).
                subscribe(noOp, done, done);
        });
    });


    describe('_toJSONG', function() {
        it('should get multiple arguments into a single _toJSONG response.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            toObservable(model.
                get(['lolomo', 0, 0, 'item', 'title'], ['lolomo', 0, 1, 'item', 'title']).
                _toJSONG()).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    var out = strip(onNext.mock.calls[0][0]);
                    var expected = strip({
                        jsonGraph: cacheGenerator(0, 2),
                        paths: [['lolomo', 0, 0, 'item', 'title'],
                            ['lolomo', 0, 1, 'item', 'title']]
                    });
                    expect(out).toEqual(expected);
                }).
                subscribe(noOp, done, done);
        });

        it('should get a complex argument into a single arg.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var onNext = jest.fn();
            toObservable(model.
                get(['lolomo', 0, {to: 1}, 'item', 'title']).
                _toJSONG()).
                doAction(onNext, noOp, function() {
                    expect(onNext).toHaveBeenCalledTimes(1);
                    var out = strip(onNext.mock.calls[0][0]);
                    var expected = strip({
                        jsonGraph: cacheGenerator(0, 2),
                        paths: [['lolomo', 0, 0, 'item', 'title'],
                            ['lolomo', 0, 1, 'item', 'title']]
                    });
                    expect(out).toEqual(expected);
                }).
                subscribe(noOp, done, done);
        });
    });
    describe('Progressively', function() {
        it('should onNext twice if at least one value found in the cache - even if it is an atom of undefined', function(done) {
            var model = new Model({
                cache: {
                    paths: {
                        0: 'test',
                        1: 'test'
                    }
                },
                source: new LocalDataSource({
                    paths: {
                        2: Model.atom('test'),
                        3: Model.atom(undefined)
                    }
                }, {materialize: true})
            });

            var onNextCount = 0;
            toObservable(model.
                get(['paths', {to:3}]).
                progressively()).
                doAction(function(value) {

                    onNextCount++;
                    if (onNextCount === 1){
                        expect(strip(value)).toEqual({
                            json: {
                                paths: {
                                    0: 'test',
                                    1: 'test'
                                }
                            }
                        });
                    }
                    else if (onNextCount === 2){
                        expect(strip(value)).toEqual({
                            json: {
                                paths: {
                                    0: 'test',
                                    1: 'test',
                                    2: 'test'
                                }
                            }
                        });
                    }
                }).subscribe(noOp, done, function(){
                    expect(onNextCount).toBe(2);
                    done();
                });
        });

        it('should get multiple arguments with multiple trips to the dataSource into a single toJSON response.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var count = 0;
            toObservable(model.
                get(['lolomo', 0, 0, 'item', 'title'], ['lolomo', 0, 1, 'item', 'title']).
                progressively()).
                doAction(function(x) {
                    count++;
                    if (count === 1) {
                        expect(strip(x)).toEqual({
                            json: {
                                lolomo: {
                                    0: {
                                        0: {
                                            item: {
                                                title: 'Video 0'
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    } else {
                        expect(strip(x)).toEqual({
                            json: {
                                lolomo: {
                                    0: {
                                        0: {
                                            item: {
                                                title: 'Video 0'
                                            }
                                        },
                                        1: {
                                            item: {
                                                title: 'Video 1'
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }, noOp, function() {
                    expect(count).toBe(2);
                }).
                subscribe(noOp, done, done);
        });

        it('should get complex path with multiple trips to the dataSource into a single toJSON response.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var count = 0;
            toObservable(model.
                get(['lolomo', 0, {to: 1}, 'item', 'title']).
                progressively()).
                doAction(function(x) {
                    count++;
                    if (count === 1) {
                        expect(strip(x)).toEqual({
                            json: {
                                lolomo: {
                                    0: {
                                        0: {
                                            item: {
                                                title: 'Video 0'
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    } else {
                        expect(strip(x)).toEqual({
                            json: {
                                lolomo: {
                                    0: {
                                        0: {
                                            item: {
                                                title: 'Video 0'
                                            }
                                        },
                                        1: {
                                            item: {
                                                title: 'Video 1'
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }, noOp, function() {
                    expect(count).toBe(2);
                }).
                subscribe(noOp, done, done);
        });

        it('should get different response objects with multiple trips to the dataSource.', function(done) {
            var model = new Model({cache: M(), source: new LocalDataSource(Cache())});
            var revisions = [];
            toObservable(model.
                get(['lolomo', 0, 0, 'item', 'title'], ['lolomo', 0, 1, 'item', 'title']).
                progressively()).
                doAction(function(x) {
                    revisions.push(x);
                }, noOp, function() {
                    expect(revisions.length).toBe(2);
                    expect(revisions[1]).not.toBe(revisions[0]);
                    expect(revisions[1].json.lolomo[0]).not.toBe(revisions[0].json.lolomo[0]);
                    expect(revisions[1].json.lolomo[0][0]).toBe(revisions[0].json.lolomo[0][0]);

                }).
                subscribe(noOp, done, done);
        });

    });
    describe('Error Selector (during merge)', function() {

        function generateErrorSelectorSpy(expectedPath) {
            return jest.fn(function(path, atom) {

                // Needs to be asserted before mutation.
                expect(atom.$type).toBe('error');
                expect(atom.value).toEqual({message:'errormsg'});

                atom.$custom = 'custom';
                atom.value.customtype = 'customtype';

                return atom;
            });
        }

        function assertExpectedErrorPayload(e, expectedPath) {
            var path = e.path;
            var value = e.value;

            // To avoid hardcoding/scrubbing $size, and other internals
            expect(path).toEqual(expectedPath);

            expect(value.$type).toBe('error');
            expect(value.$custom).toBe('custom');
            expect(value.value).toEqual({
                message: 'errormsg',
                customtype: 'customtype'
            });
        }

        it('should get invoked with the right arguments for branches in cache', function(done) {

            // Cache has [lolomo,0,0,item]
            var testPath = ['lolomo',0,0,'item','errorPath'];

            var modelCache = M();
            var dataSourceCache = Cache();
            // [lolomo,0,0,item]->[videos,0]
            dataSourceCache.videos[0].errorPath = jsonGraph.error({message:'errormsg'});

            var onNextSpy = jest.fn();
            var onErrorSpy = jest.fn();
            var errorSelectorSpy = generateErrorSelectorSpy(testPath);

            var model = new Model({
                cache: modelCache,
                source: new LocalDataSource(dataSourceCache),
                errorSelector: errorSelectorSpy
            });

            toObservable(model.
                boxValues().
                get(testPath)).
                doAction(onNextSpy, onErrorSpy, noOp).
                subscribe(
                    noOp,
                    function(e) {
                        expect(errorSelectorSpy).toHaveBeenCalledTimes(1);
                        expect(errorSelectorSpy.mock.calls[0][0]).toEqual(testPath);

                        expect(onErrorSpy).toHaveBeenCalledTimes(1);

                        expect(e.length).toBe(1);
                        assertExpectedErrorPayload(e[0], testPath);

                        done();
                    },
                    function() {
                        expect(onNextSpy).toHaveBeenCalledTimes(1);
                        expect(strip(onNextSpy.mock.calls[0][0])).toEqual({
                            json: {}
                        });
                        expect(onErrorSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
        });

        it('should get invoked with the right arguments for branches not in cache', function(done) {

            // Cache doesn't have [lolomo,1,0,item]
            var testPath = ['lolomo',1,0,'item','errorPath'];

            var modelCache = M();
            var dataSourceCache = Cache();

            // [lolomo,1,0,item]->[videos,10]
            dataSourceCache.videos[10].errorPath = jsonGraph.error({message:'errormsg'});

            var onNextSpy = jest.fn();
            var onErrorSpy = jest.fn();
            var errorSelectorSpy = generateErrorSelectorSpy(testPath);

            var model = new Model({
                cache: modelCache,
                source: new LocalDataSource(dataSourceCache),
                errorSelector: errorSelectorSpy
            });

            toObservable(model.
                boxValues().
                get(testPath)).
                doAction(onNextSpy, onErrorSpy, noOp).
                subscribe(
                    noOp,
                    function(e) {
                        expect(errorSelectorSpy).toHaveBeenCalledTimes(1);
                        expect(errorSelectorSpy.mock.calls[0][0]).toEqual(testPath);

                        expect(onErrorSpy).toHaveBeenCalledTimes(1);

                        expect(e.length).toBe(1);
                        assertExpectedErrorPayload(e[0], testPath);

                        done();
                    },
                    function() {
                        expect(onNextSpy).not.toHaveBeenCalled();
                        expect(onErrorSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
        });

        it('should get invoked with the correct error paths for a keyset', function(done) {
            var testPath = ['lolomo',[0,1],0,'item','errorPath'];

            var modelCache = M();
            var dataSourceCache = Cache();

            dataSourceCache.videos[0].errorPath = jsonGraph.error({message:'errormsg'});
            dataSourceCache.videos[10].errorPath = jsonGraph.error({message:'errormsg'});

            var onNextSpy = jest.fn();
            var onErrorSpy = jest.fn();
            var errorSelectorSpy = generateErrorSelectorSpy(testPath);

            var model = new Model({
                cache: modelCache,
                source: new LocalDataSource(dataSourceCache),
                errorSelector: errorSelectorSpy
            });

            toObservable(model.
                boxValues().
                get(testPath)).
                doAction(onNextSpy, onErrorSpy, noOp).
                subscribe(
                    noOp,
                    function(e) {
                        expect(onErrorSpy).toHaveBeenCalledTimes(1);

                        expect(errorSelectorSpy).toHaveBeenCalledTimes(2);
                        expect(errorSelectorSpy.mock.calls[0][0]).toEqual(['lolomo',0,0,'item','errorPath']);
                        expect(errorSelectorSpy.mock.calls[1][0]).toEqual(['lolomo',1,0,'item','errorPath']);

                        expect(e.length).toBe(2);
                        assertExpectedErrorPayload(e[0], ['lolomo',0,0,'item','errorPath']);
                        assertExpectedErrorPayload(e[1], ['lolomo',1,0,'item','errorPath']);

                        done();
                    },
                    function() {
                        expect(onNextSpy).not.toHaveBeenCalled();
                        expect(onErrorSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
        });

        it('should be allowed to change $type', function(done) {

            var testPath = ['lolomo',0,0,'item','errorPath'];

            var modelCache = M();
            var dataSourceCache = Cache();
            // [lolomo,0,0,item]->[videos,0]
            dataSourceCache.videos[0].errorPath = jsonGraph.error({message:'errormsg'});

            var onNextSpy = jest.fn();
            var onErrorSpy = jest.fn();

            var model = new Model({
                cache : modelCache,
                source: new LocalDataSource(dataSourceCache),
                errorSelector : function(path, atom) {
                    var o = {
                        $type: 'atom',
                        $custom: 'custom',
                        value: {
                            message: atom.value.message,
                            customtype: 'customtype'
                        }
                    };

                    return o;
                }
            });

            toObservable(model.
                boxValues().
                setValue(testPath, jsonGraph.error({message:'errormsg'}))).
                doAction(onNextSpy, onErrorSpy, noOp).
                subscribe(
                    noOp,
                    function(e) {
                        expect(onErrorSpy).not.toHaveBeenCalled();
                        done();
                    },
                    function() {

                        expect(onErrorSpy).not.toHaveBeenCalled();
                        expect(onNextSpy).toHaveBeenCalledTimes(1);

                        expect(onNextSpy.mock.calls[0][0]).toEqual({
                            $type: 'atom',
                            $custom: 'custom',
                            value: {
                                message: 'errormsg',
                                customtype: 'customtype'
                            },
                            $size:51
                        });

                        done();
                    });
        });

        it('should safely merge references over existing branches', function(done) {
            var dataSource = new LocalDataSource({"shows": {"80025172": {"seasons": {"current": {"$type": "ref","value": ["seasons","80025272"],"$size": 52}}}},"seasons": {"80025272": {"episodes": {"0": {"$type": "ref","value": ["episodes","80025313"],"$size": 52}}}},"episodes": {"80025313": {"currentUser": {"$type": "ref","value": ["currentUser"],"$size": 51}}},"currentUser": {"localized": {"preferences": {"$type": "atom","value": {"languages": ["en"],"direction": ["ltr"]},"$size": 51}},"stringTable": {"$type": "ref","value": ["stringTables","en"],"$size": 52}},"stringTables": {"en": {"detailsPopup": {"expired": {"$type": "atom","value": "Expired","$size": 57}}}}});
            var originalGet = dataSource.get;
            dataSource.get = function() {
                return Rx.Observable.throw({
                    $type: 'error',
                    value: {
                        status: 404,
                        "message": "Timed out"
                    }
                });
            };

            var model = new Model({
                _treatDataSourceErrorsAsJSONGraphErrors: true,
                source: dataSource,
                errorSelector : function(path, atom) {
                    var isError = path.indexOf('stringTable') !== -1;
                    var o = {
                        $type: !isError ? 'atom' : 'error',
                        value: {
                            message: atom.value.message,
                            customtype: 'customtype'
                        }
                    };

                    return o;
                }
            });

            var fetch = toObservable(model.
                get(
                    ["shows",80025172,"seasons","current","episodes",0,"currentUser","localized","preferences"],
                    ["shows",80025172,"seasons","current","episodes",0,"currentUser","stringTable","detailsPopup","expired"]
                ));

            var onNext = jest.fn();
            fetch.
                delay(1).
                catch(function(_) {
                    dataSource.get = originalGet;
                    model.invalidate(["shows",80025172,"seasons","current","episodes",0,"currentUser","stringTable","detailsPopup","expired"])
                    return fetch;
                }).
                doAction(onNext).
                subscribe(noOp, done,
                    function() {
                        var expected = ['currentUser', 'localized'];
                        expect(model._root.cache.currentUser.localized.$_absolutePath).toEqual(expected);
                        expect(onNext.mock.calls[0][0].json.shows[80025172].seasons.current.episodes[0].currentUser.localized.$__path).toEqual(expected);
                        done();
                    });
        });
    });
    describe("Cached data with timestamp", function() {
        var t0 = Date.parse('2000/01/01');
        var t1 = t0 + 1;

        function remoteData() {
            return {
                videos: {
                    1: {
                        bookmark: Model.atom('remote value', {$timestamp: t0})
                    },
                    2: {
                        previous: Model.ref(['videos', 1])
                    }
                }
            };
        }

        it("should not be replaced by data with an older timestamp", function(done) {
            var cache = {
                videos: {
                    1: {
                        bookmark: Model.atom('cached value', {$timestamp: t1})
                    }
                }
            };
            var source = new LocalDataSource(remoteData());
            var model = new Model({cache: cache, source: source});
            model.getValue(['videos', 2, 'previous', 'bookmark']).
                then(function(value) {
                    expect(value).toBe('cached value');
                    done();
                }).
                catch(function(e) {
                    done(e);
                });
        });

        it("when expired should be replaced by data with an older timestamp", function(done) {
            var cache = {
                videos: {
                    1: {
                        bookmark: Model.atom('cached value', {$timestamp: t1, $expires: t1})
                    }
                }
            };
            var source = new LocalDataSource(remoteData());
            var model = new Model({cache: cache, source: source});
            model.getValue(['videos', 2, 'previous', 'bookmark']).
                then(function(value) {
                    expect(value).toBe('remote value');
                    done();
                }).
                catch(function(e) {
                    done(e);
                });
        });
    });
});
